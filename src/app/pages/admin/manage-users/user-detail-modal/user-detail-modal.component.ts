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
  IonToggle,
} from '@ionic/angular/standalone';
import { AlertController, ToastController } from '@ionic/angular';
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
    IonToggle,
    LoaderComponent,
    DatePipe,
  ],
  templateUrl: './user-detail-modal.component.html',
  styleUrls: ['./user-detail-modal.component.scss'],
})
export class UserDetailModalComponent {
  private readonly api = inject(ApiService);
  private readonly userService = inject(UserService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  @Input() openRequest: { uid: string; eventId: number } | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() userRoleChange = new EventEmitter<{ uid: string; admin?: boolean; master?: boolean; banned?: boolean }>();
  @ViewChild(IonModal) private modal?: IonModal;

  public isOpen = false;
  public isLoading = false;
  public isRequestedUserActive = false;
  public isTogglingAdmin = false;
  public isTogglingMaster = false;
  public isCreatingBan = false;
  public isUnbanning = false;

  public uid = '';
  public user: any = null;
  public bans: any[] = [];
  public banPermanent = true;
  public banDateEnd = '';
  public banReason = '';
  public banFormError = '';

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
    this.resetBanForm();
    this.hasEmittedClose = false;

    try {
      const response = await this.prepareUserData(uid);

      if (currentRequest !== this.requestSequence) {
        return;
      }

      this.user = response.user;
      this.bans = Array.isArray(response?.bans) ? response.bans : [];

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

  public onBanPermanentChange(event: CustomEvent<{ checked: boolean }>): void {
    const checked = event.detail?.checked ?? false;
    this.banPermanent = checked;
    this.banFormError = '';

    if (checked) {
      this.banDateEnd = '';
    }
  }

  public onBanDateEndChange(event: Event): void {
    this.banDateEnd = (event.target as HTMLInputElement | null)?.value ?? '';
    this.banFormError = '';
  }

  public adjustBanDateEnd(direction: 1 | -1, unit: 'week' | 'month'): void {
    const disabled = this.isCreatingBan || this.isUnbanning || this.isRequestedUserActive || this.user?.banned;
    if (disabled) {
      return;
    }

    const baseDate = this.banDateEnd ? new Date(this.banDateEnd) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      return;
    }

    const nextDate = new Date(baseDate);

    if (unit === 'week') {
      nextDate.setDate(nextDate.getDate() + (7 * direction));
    } else {
      const day = nextDate.getDate();
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + direction);
      const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(day, lastDay));
    }

    this.banDateEnd = this.toInputDate(nextDate);
    this.banFormError = '';
  }

  public onBanReasonChange(event: Event): void {
    this.banReason = (event.target as HTMLTextAreaElement | null)?.value ?? '';
    this.banFormError = '';
  }

  public createBan(): void {
    if (!this.user || this.isCreatingBan || this.isRequestedUserActive) {
      return;
    }

    if (this.user.banned) {
      this.banFormError = 'El usuario ya tiene un ban activo';
      return;
    }

    const reason = this.banReason.trim();
    if (!reason) {
      this.banFormError = 'Debes indicar un motivo para el ban';
      return;
    }

    let dateEnd: string | null = null;
    if (!this.banPermanent) {
      if (!this.banDateEnd) {
        this.banFormError = 'Debes indicar una fecha fin para un ban temporal';
        return;
      }

      const parsedDate = new Date(this.banDateEnd);
      if (Number.isNaN(parsedDate.getTime())) {
        this.banFormError = 'La fecha fin no es valida';
        return;
      }

      dateEnd = this.banDateEnd;
    }

    this.banFormError = '';
    this.isCreatingBan = true;

    this.api
      .post<
        { message: string; ban: { uid: string; reason: string; permanent: boolean; date_start: string; date_end: string | null } },
        { uid: string; permanent: number; date_end: string | null; reason: string }
      >('admin/ban-user', {
        uid: this.uid,
        permanent: this.banPermanent ? 1 : 0,
        date_end: dateEnd,
        reason,
      })
      .pipe(take(1))
      .subscribe({
        next: async () => {
          this.user.banned = true;
          this.userRoleChange.emit({
            uid: this.uid,
            banned: true,
          });
          this.resetBanForm();
          await this.reloadCurrentUserData();
          await this.showSuccessToast('Usuario baneado correctamente');
        },
        error: async (error: unknown) => {
          const httpError = error instanceof HttpErrorResponse ? error : null;
          if (httpError?.status === 401) {
            this.userService.logout();
          }

          this.banFormError = this.getToggleErrorMessage(error, 'No se pudo banear al usuario');
          await this.showErrorToast(this.banFormError);
          this.isCreatingBan = false;
        },
        complete: () => {
          this.isCreatingBan = false;
        },
      });
  }

  public async confirmUnban(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.user || !this.user.banned || this.isUnbanning) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar desbloqueo',
      message: 'Esta accion quitara el bloqueo activo del usuario. Deseas continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Desbloquear',
          role: 'destructive',
          handler: () => {
            this.unbanUser();
          },
        },
      ],
    });

    await alert.present();
  }

  private unbanUser(): void {
    if (!this.uid || this.isUnbanning) {
      return;
    }

    this.isUnbanning = true;
    this.banFormError = '';

    this.api
      .get<{ message: string; uid: string; lifted: number }>(`admin/unban/${encodeURIComponent(this.uid)}`)
      .pipe(take(1))
      .subscribe({
        next: async () => {
          if (this.user) {
            this.user.banned = false;
          }
          this.userRoleChange.emit({
            uid: this.uid,
            banned: false,
          });
          await this.reloadCurrentUserData();
          await this.showSuccessToast('Usuario desbloqueado correctamente');
        },
        error: async (error: unknown) => {
          const httpError = error instanceof HttpErrorResponse ? error : null;

          if (httpError?.status === 401) {
            this.userService.logout();
          }

          const message = this.getToggleErrorMessage(error, 'No se pudo desbloquear al usuario');
          this.banFormError = message;
          await this.showErrorToast(message);
          this.isUnbanning = false;
        },
        complete: () => {
          this.isUnbanning = false;
        },
      });
  }

  public async closeModal(): Promise<void> {
    this.isOpen = false;
    this.isLoading = false;
    this.isTogglingAdmin = false;
    this.isTogglingMaster = false;
    this.isCreatingBan = false;
    this.isUnbanning = false;
    this.resetBanForm();

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

  private resetBanForm(): void {
    this.banPermanent = true;
    this.banDateEnd = '';
    this.banReason = '';
    this.banFormError = '';
  }

  private async reloadCurrentUserData(): Promise<void> {
    if (!this.uid) {
      return;
    }

    const response = await this.prepareUserData(this.uid);
    this.user = response.user;
    this.bans = Array.isArray(response?.bans) ? response.bans : [];
  }

  public getBanEndLabel(ban: any): string {
    if (ban?.permanent) {
      return 'Permanente';
    }

    return ban?.date_end ? this.formatDate(ban.date_end) : '-';
  }

  public getBanResponsible(ban: any): string {
    if (typeof ban?.banned_by_name === 'string' && ban.banned_by_name.trim()) {
      return ban.banned_by_name;
    }

    return 'Sin responsable';
  }

  private formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
