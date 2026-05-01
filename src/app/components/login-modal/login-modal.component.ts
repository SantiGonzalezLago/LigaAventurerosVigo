import { ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, NgZone, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
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
import { firstValueFrom, take } from 'rxjs';
import { UserService } from 'src/app/services/user.service';

addIcons({ closeOutline, eyeOffOutline, eyeOutline });

type GoogleCredentialResponse = { credential?: string };
type GoogleAccountsIdApi = {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(container: HTMLElement, options: Record<string, string | number | boolean>): void;
};
type GoogleWindowApi = Window & {
  google?: {
    accounts?: {
      id?: GoogleAccountsIdApi;
    };
  };
};

let googleScriptLoader: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  const googleWindow = window as GoogleWindowApi;

  if (googleWindow.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptLoader) {
    return googleScriptLoader;
  }

  googleScriptLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    if (existingScript) {
      if (googleWindow.google?.accounts?.id) {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });

  return googleScriptLoader;
}

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  imports: [FormsModule, IonButton, IonButtons, IonHeader, IonIcon, IonInput, IonItem, IonModal, IonText, IonTitle, IonToolbar],
})
export class LoginModalComponent implements OnChanges {
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private googleClientId: string | null = null;
  private googleInitializedForCurrentOpen = false;

  @ViewChild('googleButtonContainer') private googleButtonContainer?: ElementRef<HTMLDivElement>;

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  public user = '';
  public password = '';
  public showPassword = false;
  public isSubmitting = false;
  public isGoogleLoading = false;
  public hasGoogleSetupError = false;
  public googleButtonReady = false;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === false) {
      this.googleInitializedForCurrentOpen = false;
    }
  }

  public onDidPresent(): void {
    void this.initializeGoogleLogin();
  }

  public onDidDismiss(): void {
    this.googleInitializedForCurrentOpen = false;
    this.googleButtonReady = false;
    this.hasGoogleSetupError = false;
    const container = this.googleButtonContainer?.nativeElement;
    if (container) {
      container.innerHTML = '';
    }
    this.resetForm();
    this.close.emit();
  }

  public login(): void {
    if (this.isSubmitting || !this.user.trim() || !this.password) {
      return;
    }

    this.isSubmitting = true;

    this.userService.loginPassword(this.user.trim(), this.password).pipe(take(1)).subscribe((result) => {
      this.isSubmitting = false;

      if (result.success) {
        void this.showLoginSuccessToast();
        this.resetForm();
        this.close.emit();
        return;
      }

      void this.showLoginErrorToast(result.message ?? 'No se pudo iniciar sesion');
    });
  }

  public retryGoogleSetup(): void {
    void this.initializeGoogleLogin(true);
  }

  private resetForm(): void {
    this.user = '';
    this.password = '';
    this.showPassword = false;
    this.isSubmitting = false;
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
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

  private async showLoginErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2400,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
      color: 'danger',
    });

    await toast.present();
  }

  private async initializeGoogleLogin(forceRefreshClient = false): Promise<void> {
    if (!this.isOpen || this.isGoogleLoading) {
      return;
    }

    if (!forceRefreshClient && this.googleInitializedForCurrentOpen && this.googleButtonReady) {
      return;
    }

    this.isGoogleLoading = true;
    this.hasGoogleSetupError = false;
    this.googleButtonReady = false;

    try {
      const clientId = await firstValueFrom(this.userService.getGoogleClientId(forceRefreshClient).pipe(take(1)));
      await loadGoogleIdentityScript();

      const googleWindow = window as GoogleWindowApi;
      const googleAccounts = googleWindow.google?.accounts?.id;

      if (!googleAccounts) {
        throw new Error('Google Identity Services no está disponible');
      }

      if (this.googleClientId !== clientId) {
        googleAccounts.initialize({
          client_id: clientId,
          callback: (response) => {
            this.ngZone.run(() => {
              this.handleGoogleCredential(response);
            });
          },
          cancel_on_tap_outside: false,
        });

        this.googleClientId = clientId;
      }

      this.googleButtonReady = true;
      this.cdr.detectChanges();

      const container = this.googleButtonContainer?.nativeElement;
      if (!container) {
        throw new Error('No se pudo crear el contenedor del botón de Google');
      }

      container.innerHTML = '';
      googleAccounts.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        text: 'continue_with',
        shape: 'pill',
        size: 'large',
        width: Math.max(220, Math.floor(container.clientWidth)),
      });
      this.googleInitializedForCurrentOpen = true;
    } catch (error: unknown) {
      this.googleButtonReady = false;
      this.googleInitializedForCurrentOpen = false;
      this.hasGoogleSetupError = true;
      await this.showLoginErrorToast(this.resolveErrorMessage(error) ?? 'No se pudo preparar el login con Google');
    } finally {
      this.isGoogleLoading = false;
    }
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    const token = typeof response.credential === 'string' ? response.credential.trim() : '';

    if (!token || this.isSubmitting) {
      if (!token) {
        void this.showLoginErrorToast('No se pudo obtener el token de Google');
      }

      return;
    }

    this.isSubmitting = true;

    this.userService.loginGoogle(token).pipe(take(1)).subscribe((result) => {
      this.isSubmitting = false;

      if (result.success) {
        void this.showLoginSuccessToast();
        this.resetForm();
        this.close.emit();
        return;
      }

      void this.showLoginErrorToast(result.message ?? 'No se pudo iniciar sesion con Google');
    });
  }

  private resolveErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return undefined;
  }
}
