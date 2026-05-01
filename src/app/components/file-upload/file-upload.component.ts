import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, closeOutline, linkOutline } from 'ionicons/icons';

addIcons({ cloudUploadOutline, closeOutline, linkOutline });

@Component({
  selector: 'app-file-upload',
  standalone: true,
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
  ],
})
export class FileUploadComponent implements OnChanges {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  @Input() public type = 'image';
  @Input() public isOpen = false;
  @Input({ alias: 'file_max_size' }) public fileMaxSize: number | null = null;
  @Input({ alias: 'image_max_dimension' }) public imageMaxDimension: number | null = null;

  @Output() public fileSelected = new EventEmitter<{ file: File; previewUrl: string; source: 'device' | 'url' }>();
  @Output() public fileError = new EventEmitter<string>();
  @Output() public close = new EventEmitter<void>();

  public fileUrl = '';
  public isFetchingUrl = false;
  public isDragOver = false;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.fileUrl = '';
    }
  }

  public get title(): string {
    if (this.isImageUpload()) {
      return 'Subir imagen';
    }

    return 'Subir archivo';
  }

  public get acceptAttribute(): string {
    return this.isImageUpload() ? 'image/*' : this.type;
  }

  public onDidDismiss(): void {
    this.close.emit();
  }

  public selectFromDevice(): void {
    this.openDevicePicker();
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  public async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragOver = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    await this.processFile(file, 'device');

    if (event.dataTransfer) {
      event.dataTransfer.clearData();
    }
  }

  public openDevicePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    await this.processFile(file, 'device');
    input.value = '';
  }

  public async uploadFromUrl(): Promise<void> {
    if (this.isFetchingUrl) {
      return;
    }

    const rawUrl = this.fileUrl.trim();
    if (!rawUrl) {
      this.setError('Introduce una URL valida');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      this.setError('Introduce una URL valida');
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      this.setError('La URL debe usar http o https');
      return;
    }

    this.isFetchingUrl = true;
    this.clearError();

    try {
      const response = await fetch(parsedUrl.toString());
      if (!response.ok) {
        this.setError('No se pudo descargar el archivo desde la URL');
        return;
      }

      const blob = await response.blob();
      const fileName = this.getFileNameFromUrl(parsedUrl);
      const fallbackType = this.isImageUpload() ? 'image/png' : this.type;
      const fileType = blob.type || fallbackType;
      const file = new File([blob], fileName, {
        type: fileType,
        lastModified: Date.now(),
      });

      await this.processFile(file, 'url');
    } catch {
      this.setError('No se pudo descargar el archivo desde la URL');
    } finally {
      this.isFetchingUrl = false;
    }
  }

  private async processFile(inputFile: File, source: 'device' | 'url'): Promise<void> {
    const configError = this.getConfigurationError();
    if (configError) {
      this.setError(configError);
      return;
    }

    if (!this.isAcceptedType(inputFile.type)) {
      this.setError(this.getTypeErrorMessage());
      return;
    }

    this.clearError();

    let file = inputFile;
    let previewUrl = '';

    if (this.isImageUpload()) {
      try {
        if (this.imageMaxDimension && this.imageMaxDimension > 0) {
          const resized = await this.resizeImage(file, this.imageMaxDimension);
          if (!resized) {
            this.setError('No se pudo procesar la imagen');
            return;
          }

          file = resized.file;
          previewUrl = resized.previewUrl;
        } else {
          previewUrl = await this.fileToDataUrl(file);
        }
      } catch {
        this.setError('No se pudo procesar la imagen');
        return;
      }
    }

    if (this.fileMaxSize && this.fileMaxSize > 0 && file.size > this.fileMaxSize) {
      this.setError(`El archivo supera el tamano maximo de ${this.formatBytes(this.fileMaxSize)}`);
      return;
    }

    this.fileUrl = '';
    this.fileSelected.emit({ file, previewUrl, source });
    this.close.emit();
  }

  private async resizeImage(file: File, maxDimension: number): Promise<{ file: File; previewUrl: string } | null> {
    let image: HTMLImageElement;

    try {
      image = await this.loadImage(file);
    } catch {
      return null;
    }

    const largestSide = Math.max(image.width, image.height);
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = this.getOutputImageType(file.type);
    const blob = await new Promise<Blob | null>((resolve) => {
      if (outputType === 'image/jpeg') {
        canvas.toBlob((canvasBlob) => resolve(canvasBlob), outputType, 0.92);
        return;
      }

      canvas.toBlob((canvasBlob) => resolve(canvasBlob), outputType);
    });

    if (!blob) {
      return null;
    }

    const resizedFile = new File([blob], this.renameFileWithMime(file.name, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });

    let previewUrl = '';

    try {
      previewUrl = await this.fileToDataUrl(resizedFile);
    } catch {
      return null;
    }

    return {
      file: resizedFile,
      previewUrl,
    };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          reject(new Error('Empty image'));
          return;
        }

        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Invalid image'));
        image.src = result;
      };

      reader.onerror = () => reject(new Error('Read error'));
      reader.readAsDataURL(file);
    });
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Invalid data url'));
      };
      reader.onerror = () => reject(new Error('Read error'));
      reader.readAsDataURL(file);
    });
  }

  private getOutputImageType(originalType: string): string {
    const normalizedType = originalType.trim().toLowerCase();
    if (normalizedType === 'image/jpeg' || normalizedType === 'image/png' || normalizedType === 'image/webp') {
      return normalizedType;
    }

    return 'image/png';
  }

  private renameFileWithMime(fileName: string, mimeType: string): string {
    const extensionByMime: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const extension = extensionByMime[mimeType] ?? 'bin';
    const nameWithoutExtension = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;

    return `${nameWithoutExtension || 'file'}.${extension}`;
  }

  private getFileNameFromUrl(url: URL): string {
    const segments = url.pathname.split('/').filter((segment) => segment.trim().length > 0);
    const lastSegment = segments.length > 0 ? segments[segments.length - 1] : '';

    if (!lastSegment) {
      return `file-${Date.now()}`;
    }

    try {
      return decodeURIComponent(lastSegment);
    } catch {
      return lastSegment;
    }
  }

  private getConfigurationError(): string | null {
    if (!this.isImageUpload() && (!this.fileMaxSize || this.fileMaxSize <= 0)) {
      return 'file_max_size es obligatorio cuando type no es image';
    }

    if (this.fileMaxSize !== null && this.fileMaxSize <= 0) {
      return 'file_max_size debe ser mayor a 0';
    }

    return null;
  }

  public isImageUpload(): boolean {
    return this.type.trim().toLowerCase() === 'image';
  }

  private isAcceptedType(fileMimeType: string): boolean {
    const normalizedFileType = fileMimeType.trim().toLowerCase();

    if (!normalizedFileType) {
      return false;
    }

    if (this.isImageUpload()) {
      return normalizedFileType.startsWith('image/');
    }

    return normalizedFileType === this.type.trim().toLowerCase();
  }

  private getTypeErrorMessage(): string {
    if (this.isImageUpload()) {
      return 'Selecciona un archivo de imagen valido';
    }

    return `El archivo debe ser de tipo ${this.type}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setError(message: string): void {
    this.fileError.emit(message);
  }

  private clearError(): void {
    this.fileError.emit('');
  }
}
