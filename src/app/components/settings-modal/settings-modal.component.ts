import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, personCircleOutline } from 'ionicons/icons';
import { firstValueFrom, take } from 'rxjs';
import { FileUploadComponent } from 'src/app/components/file-upload/file-upload.component';
import { UserData, UserService } from 'src/app/services/user.service';

addIcons({ addOutline, closeOutline, personCircleOutline });

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss'],
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonModal,
    IonTitle,
    IonToolbar,
    FileUploadComponent,
  ],
})
export class SettingsModalComponent implements OnChanges {
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private activeUser: UserData | null = null;

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  public uid = '';
  public username = '';
  public avatarPreview = '';
  public isAvatarUploadModalOpen = false;
  public password = '';
  public passwordRepeat = '';
  private avatarFile: File | null = null;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.prefillForm();
    }
  }

  public onDidDismiss(): void {
    this.isAvatarUploadModalOpen = false;
    this.resetForm();
    this.close.emit();
  }

  public closeModal(): void {
    this.isAvatarUploadModalOpen = false;
    this.resetForm();
    this.close.emit();
  }

  public openAvatarUploadModal(): void {
    this.isAvatarUploadModalOpen = true;
  }

  public closeAvatarUploadModal(): void {
    this.isAvatarUploadModalOpen = false;
  }

  public onAvatarSelected(selection: { file: File; previewUrl: string; source: 'device' | 'url' }): void {
    this.avatarFile = selection.file;
    this.avatarPreview = selection.previewUrl;
    this.isAvatarUploadModalOpen = false;
  }

  public onAvatarUploadError(message: string): void {
    void this.showErrorToast(message);
  }

  public async saveChanges(): Promise<void> {
    const normalizedUsername = this.username.trim();

    if (!normalizedUsername) {
      await this.showErrorToast('El nombre de usuario es obligatorio');
      return;
    }

    if (this.password !== this.passwordRepeat) {
      await this.showErrorToast('Las contraseñas no coinciden');
      return;
    }

    if (!this.activeUser) {
      await this.showErrorToast('No hay un usuario activo para actualizar');
      return;
    }

    const hasNameChange = normalizedUsername !== this.activeUser.name;
    const hasPasswordChange = this.password.trim().length > 0;
    const hasAvatarChange = this.avatarFile !== null;

    if (!hasNameChange && !hasPasswordChange && !hasAvatarChange) {
      await this.showErrorToast('No hay cambios para guardar');
      return;
    }

    const payload: { name?: string; password?: string; avatar?: File } = {};
    if (hasNameChange) {
      payload.name = normalizedUsername;
    }

    if (hasPasswordChange) {
      payload.password = this.password;
    }

    if (hasAvatarChange && this.avatarFile) {
      payload.avatar = this.avatarFile;
    }

    const result = await firstValueFrom(this.userService.updateSettings(payload).pipe(take(1)));
    if (!result.success) {
      await this.showErrorToast(result.message ?? 'No se pudieron guardar los cambios');
      return;
    }

    if (result.user) {
      this.activeUser = result.user;
      this.uid = result.user.uid;
      this.username = result.user.name;
      this.avatarPreview = result.user.avatar ?? '';
    }

    this.avatarFile = null;
    this.password = '';
    this.passwordRepeat = '';
    await this.showSuccessToast(result.message ?? 'Cambios guardados');
  }

  private prefillForm(): void {
    this.activeUser = this.userService.getActiveUser();
    this.uid = this.activeUser?.uid ?? '';
    this.username = this.activeUser?.name ?? '';
    this.avatarPreview = this.activeUser?.avatar ?? '';
    this.password = '';
    this.passwordRepeat = '';
    this.avatarFile = null;
  }

  private resetForm(): void {
    this.activeUser = null;
    this.uid = '';
    this.username = '';
    this.avatarPreview = '';
    this.isAvatarUploadModalOpen = false;
    this.password = '';
    this.passwordRepeat = '';
    this.avatarFile = null;
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'bottom',
      color: 'danger',
    });

    await toast.present();
  }

  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'bottom',
      color: 'success',
    });

    await toast.present();
  }

  public async confirmDeleteAccount(): Promise<void> {
    const alert = await this.alertController.create({
      header: '¿Estás seguro de que quieres eliminar tu cuenta?',
      message: 'Tu cuenta se eliminará en 15 días. Para cancelar, inicia sesión durante ese período.',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí',
          role: 'destructive',
          cssClass: 'alert-button-danger',
          handler: () => {
            void this.deleteAccount();
          },
        },
      ],
    });
    await alert.present();
  }

  private async deleteAccount(): Promise<void> {
    const result = await firstValueFrom(this.userService.deleteActiveUser().pipe(take(1)));
    if (!result.success) {
      await this.showErrorToast(result.message ?? 'No se pudo programar la eliminación de la cuenta');
      return;
    }

    const formattedDate = this.formatDeleteDate(result.deleteOn);
    const successMessage = formattedDate
      ? `Tu cuenta se eliminará el ${formattedDate}. Inicia sesión antes de esa fecha para cancelar.`
      : 'Tu cuenta se eliminará próximamente. Inicia sesión antes de esa fecha para cancelar.';

    this.closeModal();
    await this.showSuccessToast(successMessage);
  }

  private formatDeleteDate(dateIso?: string): string | null {
    if (!dateIso) {
      return null;
    }

    const parts = dateIso.split('-');
    if (parts.length !== 3) {
      return null;
    }

    const [year, month, day] = parts;
    if (!year || !month || !day) {
      return null;
    }

    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
}
