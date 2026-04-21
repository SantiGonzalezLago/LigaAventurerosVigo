import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { firstValueFrom, take } from 'rxjs';
import { LoaderComponent } from '../../../../components/loader/loader.component';
import { ApiService } from '../../../../services/api.service';
import { UserService } from 'src/app/services/user.service';

addIcons({ closeOutline });

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    LoaderComponent,
    DatePipe,
  ],
  templateUrl: './user-detail-modal.component.html',
  styleUrls: ['./user-detail-modal.component.scss'],
})
export class UserDetailModalComponent {
  private readonly api = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);
  @Input() openRequest: { uid: string; eventId: number } | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() userRoleChange = new EventEmitter<{ uid: string; admin?: boolean; master?: boolean }>();
  @ViewChild(IonModal) private modal?: IonModal;

  public isOpen = false;
  public isLoading = false;
  public isRequestedUserActive = false;
  public isTogglingAdmin = false;
  public isTogglingMaster = false;

  public uid = '';
  public user: any = null;
  public bans: any[] = [];

  private requestSequence = 0;
  private hasEmittedClose = false;

  public ngOnChanges(changes: SimpleChanges): void {
    const openRequest = changes['openRequest']?.currentValue as { uid: string; eventId: number } | null;

    if (openRequest) {
      void this.handleOpenRequest(openRequest.uid);
    }
  }

  private async handleOpenRequest(uid: string): Promise<void> {
    this.requestSequence += 1;
    const currentRequest = this.requestSequence;
    this.isLoading = true;
    this.isOpen = false;
    this.isRequestedUserActive = this.userService.getActiveUid() === uid;
    this.isTogglingAdmin = false;
    this.isTogglingMaster = false;
    this.uid = uid;
    this.user = null;
    this.bans = [];
    this.hasEmittedClose = false;

    console.log('User UID:', uid);

    try {
      const response = await this.prepareUserData(uid);

      if (currentRequest !== this.requestSequence) {
        return;
      }

      this.user = response.user;
      this.bans = response.user.bans;

      this.isOpen = true;
    } catch (error: unknown) {
      if (currentRequest !== this.requestSequence) {
        return;
      }

      if (error instanceof HttpErrorResponse) {
        await this.showErrorToast(this.getHttpErrorMessage(error));
      } else {
        await this.showErrorToast('Error inesperado al cargar el usuario');
      }
    } finally {
      if (currentRequest === this.requestSequence) {
        this.isLoading = false;
      }
    }
  }

  private async prepareUserData(uid: string): Promise<any> {
    return firstValueFrom(this.api.get(`admin/user/${encodeURIComponent(uid)}`).pipe(take(1)));
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = error.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    if (error.status > 0) {
      return `Error ${error.status} al cargar el usuario`;
    }

    return 'Error de red al cargar el usuario';
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

  private getToggleErrorMessage(error: unknown, fallbackMessage: string): string {
    const httpError = error instanceof HttpErrorResponse ? error : null;
    const apiMessage = httpError?.error?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    if (httpError?.status === 401) {
      return 'No autorizado';
    }

    if (httpError?.status === 404) {
      return 'Usuario no encontrado';
    }

    if (httpError?.status === 403) {
      return 'No puedes modificar tus propios permisos de admin';
    }

    if (httpError?.status && httpError.status > 0) {
      return `Error ${httpError.status}`;
    }

    return fallbackMessage;
  }

  public impersonateUser(): void {
    if (this.isRequestedUserActive || !this.uid) {
      return;
    }

    this.userService.loginAdmin(this.uid).pipe(take(1)).subscribe(async (result) => {
      if (result.success) {
        await this.closeModal();
        return;
      }

      await this.showErrorToast(result.message ?? 'No se pudo suplantar el usuario');
    });
  }

  public toggleAdmin(): void {
    if (!this.user || this.isTogglingAdmin) {
      return;
    }

    if (this.isRequestedUserActive) {
      return;
    }

    const nextAdmin = !this.user.admin;
    this.isTogglingAdmin = true;

    this.api
      .post<{ message: string; uid: string; admin: boolean }, { uid: string; state: number }>(
        'admin/toggle-admin',
        {
          uid: this.uid,
          state: nextAdmin ? 1 : 0,
        }
      )
      .pipe(take(1))
      .subscribe({
        next: async (response) => {
          this.user.admin = response.admin;
          this.userRoleChange.emit({
            uid: response.uid || this.uid,
            admin: response.admin,
          });
          await this.showSuccessToast('Permiso de administrador actualizado');
        },
        error: async (error: unknown) => {
          const httpError = error instanceof HttpErrorResponse ? error : null;

          if (httpError?.status === 401) {
            this.userService.logout();
          }

          this.isTogglingAdmin = false;
          await this.showErrorToast(
            this.getToggleErrorMessage(error, 'No se pudo actualizar el permiso de administrador')
          );
        },
        complete: () => {
          this.isTogglingAdmin = false;
        },
      });
  }

  public toggleMaster(): void {
    if (!this.user || this.isTogglingMaster) {
      return;
    }

    const nextMaster = !this.user.master;
    this.isTogglingMaster = true;

    this.api
      .post<{ message: string; uid: string; master: boolean }, { uid: string; state: number }>(
        'admin/toggle-master',
        {
          uid: this.uid,
          state: nextMaster ? 1 : 0,
        }
      )
      .pipe(take(1))
      .subscribe({
        next: async (response) => {
          this.user.master = response.master;
          this.userRoleChange.emit({
            uid: response.uid || this.uid,
            master: response.master,
          });
          await this.showSuccessToast('Permiso de master actualizado');
        },
        error: async (error: unknown) => {
          const httpError = error instanceof HttpErrorResponse ? error : null;

          if (httpError?.status === 401) {
            this.userService.logout();
          }

          this.isTogglingMaster = false;
          await this.showErrorToast(
            this.getToggleErrorMessage(error, 'No se pudo actualizar el permiso de master')
          );
        },
        complete: () => {
          this.isTogglingMaster = false;
        },
      });
  }

  public async closeModal(): Promise<void> {
    this.isOpen = false;
    this.isLoading = false;
    this.isTogglingAdmin = false;
    this.isTogglingMaster = false;

    if (this.modal) {
      await this.modal.dismiss(undefined, 'close').catch(() => undefined);
    }

    this.emitCloseOnce();
  }

  public onDidDismiss(): void {
    this.isOpen = false;
    this.isRequestedUserActive = false;
    this.emitCloseOnce();
  }

  private emitCloseOnce(): void {
    if (this.hasEmittedClose) {
      return;
    }

    this.hasEmittedClose = true;
    this.close.emit();
  }
}
