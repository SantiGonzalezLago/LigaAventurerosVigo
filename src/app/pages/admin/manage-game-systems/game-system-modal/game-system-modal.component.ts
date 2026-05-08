import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonItem,
  IonInput,
  IonIcon,
  IonToggle,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { take } from 'rxjs';
import { FileUploadComponent } from '../../../../components/file-upload/file-upload.component';
import { ApiService } from '../../../../services/api.service';
import { UserService } from '../../../../services/user.service';

addIcons({ closeOutline });

@Component({
  selector: 'app-game-system-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonItem,
    IonInput,
    IonIcon,
    IonToggle,
    FileUploadComponent,
  ],
  templateUrl: './game-system-modal.component.html',
  styleUrls: ['./game-system-modal.component.scss'],
})
export class GameSystemModalComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);

  @Input() openRequest: {
    system: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean } | null;
    eventId: number;
  } | null = null;
  @Output() saved = new EventEmitter<{ id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean; isNew: boolean }>();
  @Output() modalClose = new EventEmitter<void>();
  @ViewChild(IonModal) private modal?: IonModal;

  isOpen = false;
  isFileUploadOpen = false;
  showErrors = false;
  isSaving = false;
  slugManuallyEdited = false;

  nameDraft = '';
  slugDraft = '';
  iconPreviewUrl = '';
  activeDraft = true;
  pcLimitDraft = 0;
  iconFile: File | null = null;
  private originalIconUrl = '';

  private editingId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const req = changes['openRequest']?.currentValue as typeof this.openRequest;
    if (req != null) {
      this.editingId = req.system?.id ?? null;
      this.nameDraft = req.system?.name ?? '';
      this.slugDraft = req.system?.slug ?? '';
      this.iconPreviewUrl = req.system?.icon ?? '';
      this.activeDraft = req.system?.active ?? true;
      this.pcLimitDraft = req.system?.pc_limit ?? 0;
      this.originalIconUrl = req.system?.icon ?? '';
      this.iconFile = null;
      this.isFileUploadOpen = false;
      this.showErrors = false;
      this.isSaving = false;
      this.slugManuallyEdited = this.editingId !== null;
      this.isOpen = true;
    }
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  onNameInput(): void {
    if (this.slugManuallyEdited) {
      return;
    }
    this.slugDraft = this.nameDraft
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-');
  }

  onSlugInput(): void {
    this.slugManuallyEdited = this.slugDraft.length > 0;
  }

  onFileSelected(event: { file: File; previewUrl: string; source: 'device' | 'url' }): void {
    this.iconFile = event.file;
    this.iconPreviewUrl = event.previewUrl;
    this.isFileUploadOpen = false;
  }

  onActiveChange(event: CustomEvent): void {
    this.activeDraft = !!event.detail?.checked;
  }

  save(): void {
    if (!this.nameDraft.trim() || !this.slugDraft.trim()) {
      this.showErrors = true;
      return;
    }

    this.isSaving = true;

    if (this.isEditing) {
      this.saveEdit();
    } else {
      this.saveNew();
    }
  }

  private saveNew(): void {
    const body = {
      name: this.nameDraft.trim(),
      slug: this.slugDraft.trim(),      pc_limit: this.pcLimitDraft,      active: this.activeDraft ? 1 : 0,
    };
    const files: Record<string, File> = this.iconFile ? { icon: this.iconFile } : {};

    this.api.postWithFiles<{ message: string; id: number }, typeof body>(
      'game-systems/add', body, files
    ).pipe(take(1)).subscribe({
      next: async (response) => {
        this.isSaving = false;
        this.isOpen = false;
        this.saved.emit({
          id: response.id,
          name: this.nameDraft.trim(),
          slug: this.slugDraft.trim(),
          icon: this.iconPreviewUrl || null,
          pc_limit: this.pcLimitDraft,
          active: this.activeDraft,
          isNew: true,
        });
        await this.showToast('Sistema creado correctamente', 'success');
      },
      error: async (err: unknown) => {
        this.isSaving = false;
        await this.handleError(err);
      },
    });
  }

  private saveEdit(): void {
    const body: {
      name: string;
      slug: string;
      pc_limit: number;
      active: number;
      remove_icon?: string;
    } = {
      name: this.nameDraft.trim(),
      slug: this.slugDraft.trim(),
      pc_limit: this.pcLimitDraft,
      active: this.activeDraft ? 1 : 0,
    };
    const files: Record<string, File> = this.iconFile ? { icon: this.iconFile } : {};

    const hadIcon = !!this.originalIconUrl;
    const nowHasIcon = !!this.iconPreviewUrl;
    if (hadIcon && !nowHasIcon) {
      body['remove_icon'] = '1';
    }

    this.api.postWithFiles<{ message: string }, typeof body>(
      `game-systems/update/${this.editingId}`, body, files
    ).pipe(take(1)).subscribe({
      next: async () => {
        this.isSaving = false;
        this.isOpen = false;
        this.saved.emit({
          id: this.editingId!,
          name: this.nameDraft.trim(),
          slug: this.slugDraft.trim(),
          icon: this.iconPreviewUrl || null,
          pc_limit: this.pcLimitDraft,
          active: this.activeDraft,
          isNew: false,
        });
        await this.showToast('Sistema actualizado correctamente', 'success');
      },
      error: async (err: unknown) => {
        this.isSaving = false;
        await this.handleError(err);
      },
    });
  }

  private async handleError(err: unknown): Promise<void> {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        this.userService.logout();
        return;
      }
      await this.showToast(err.error?.message ?? 'Error al guardar el sistema', 'danger');
    } else {
      await this.showToast('Error al guardar el sistema', 'danger');
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }

  closeModal(): void {
    this.isOpen = false;
  }

  onDidDismiss(): void {
    this.isOpen = false;
    this.modalClose.emit();
  }
}
