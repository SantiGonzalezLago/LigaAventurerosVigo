import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { take } from 'rxjs';
import { UserService } from 'src/app/services/user.service';

addIcons({ closeOutline, eyeOffOutline, eyeOutline });

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  imports: [FormsModule, IonButton, IonButtons, IonHeader, IonIcon, IonInput, IonItem, IonModal, IonText, IonTitle, IonToolbar],
})
export class LoginModalComponent {
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  public user = '';
  public password = '';
  public showPassword = false;
  public isSubmitting = false;
  public errorMessage = '';

  public onDidDismiss(): void {
    this.resetForm();
    this.close.emit();
  }

  public login(): void {
    if (this.isSubmitting || !this.user.trim() || !this.password) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.userService.loginPassword(this.user.trim(), this.password).pipe(take(1)).subscribe((success) => {
      this.isSubmitting = false;

      if (success) {
        void this.showLoginSuccessToast();
        this.resetForm();
        this.close.emit();
        return;
      }

      this.errorMessage = 'Usuario o contraseña incorrectos';
    });
  }

  private resetForm(): void {
    this.user = '';
    this.password = '';
    this.showPassword = false;
    this.isSubmitting = false;
    this.errorMessage = '';
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  public clearErrorMessage(): void {
    if (!this.errorMessage) {
      return;
    }

    this.errorMessage = '';
  }

  public closeModal(): void {
    this.resetForm();
    this.close.emit();
  }

  private async showLoginSuccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Sesión iniciada',
      duration: 1800,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
      color: 'success',
    });

    await toast.present();
  }
}
