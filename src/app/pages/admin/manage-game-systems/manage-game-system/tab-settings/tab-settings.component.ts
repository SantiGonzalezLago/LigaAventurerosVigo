import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, NgZone, OnChanges, SimpleChanges, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import {
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';
import { take } from 'rxjs';
import { ErrorStateComponent } from '../../../../../components/error-state/error-state.component';
import { LoaderComponent } from '../../../../../components/loader/loader.component';
import { ApiService } from '../../../../../services/api.service';
import { SettingModalComponent } from './setting-modal/setting-modal.component';

addIcons({ addOutline, createOutline, trashOutline });

@Component({
  selector: 'app-tab-settings',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonFab,
    IonFabButton,
    IonIcon,
    LoaderComponent,
    ErrorStateComponent,
    SettingModalComponent,
  ],
  templateUrl: './tab-settings.component.html',
  styleUrls: ['./tab-settings.component.scss'],
})
export class TabSettingsComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly ngZone = inject(NgZone);

  @Input() systemId: number | null = null;

  loading = false;
  saving = false;
  deleting = false;
  loadError: string | null = null;
  isSettingModalOpen = false;
  settingModalMode: 'create' | 'edit' = 'create';
  selectedSettingId: number | null = null;
  settingModalSeed: { id: number; name: string; slug: string; description: string | null; active: boolean } | null = null;

  settings: { id: number; system_id: number; name: string; slug: string; description: string | null; active: boolean }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['systemId']?.currentValue != null) {
      this.loadSettings();
    }
  }

  reloadSettings(): void {
    if (this.loading) {
      return;
    }

    this.loadSettings();
  }

  openCreateModal(): void {
    this.settingModalMode = 'create';
    this.selectedSettingId = null;
    this.settingModalSeed = null;
    this.isSettingModalOpen = true;
  }

  openEditModal(setting: { id: number; name: string; slug: string; description: string | null; active: boolean }): void {
    this.settingModalMode = 'edit';
    this.selectedSettingId = setting.id;
    this.settingModalSeed = {
      id: setting.id,
      name: setting.name,
      slug: setting.slug,
      description: setting.description ?? '',
      active: setting.active,
    };
    this.isSettingModalOpen = true;
  }

  requestDeleteSetting(setting: { id: number }): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.selectedSettingId = setting.id;
    void this.deleteSelectedSetting();
  }

  closeModal(): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.isSettingModalOpen = false;
  }

  saveModal(draft: { name: string; slug: string; description: string; active: boolean }): void {
    if (!this.systemId || this.saving) {
      return;
    }

    const name = draft.name.trim();
    const slug = draft.slug.trim();

    const body: {
      name: string;
      slug: string;
      description?: string;
      active: boolean;
    } = {
      name,
      slug,
      ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
      active: draft.active,
    };

    this.saving = true;

    if (this.settingModalMode === 'create') {
      this.api.post<{ message: string; id: number }, typeof body>(
        `game-systems/${this.systemId}/setting/add`,
        body
      )
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.saving = false;
            this.isSettingModalOpen = false;
            void this.showToast('Setting creado correctamente', 'success');
            this.loadSettings();
          },
          error: (error: unknown) => {
            this.saving = false;
            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo crear el setting'
                : 'No se pudo crear el setting';
            void this.showToast(message, 'danger');
          },
        });
      return;
    }

    if (!this.selectedSettingId) {
      this.saving = false;
      return;
    }

    this.api.post<{ message: string }, typeof body>(
      `game-systems/${this.systemId}/setting/${this.selectedSettingId}/update`,
      body
    )
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.isSettingModalOpen = false;
          void this.showToast('Setting actualizado', 'success');
          this.loadSettings();
        },
        error: (error: unknown) => {
          this.saving = false;
          const message =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudo actualizar el setting'
              : 'No se pudo actualizar el setting';
          void this.showToast(message, 'danger');
        },
      });
  }

  async deleteSelectedSetting(): Promise<void> {
    if (!this.systemId || this.selectedSettingId == null || this.deleting || this.saving) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar setting',
      message: 'Esta accion no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.confirmDeleteSelectedSetting();
          },
        },
      ],
    });

    await alert.present();
  }

  private confirmDeleteSelectedSetting(): void {
    if (!this.systemId || this.selectedSettingId == null || this.deleting || this.saving) {
      return;
    }

    this.deleting = true;
    const deleteId = this.selectedSettingId;

    this.api.delete<{ message: string }>(`game-systems/${this.systemId}/setting/${deleteId}/delete`)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleting = false;
            this.isSettingModalOpen = false;
            const deletedId = String(deleteId);
            this.settings = [...this.settings.filter((setting) => String(setting.id) !== deletedId)];
            this.selectedSettingId = null;
            void this.showToast('Setting eliminado', 'success');
          });
        },
        error: (error: unknown) => {
          this.ngZone.run(() => {
            this.deleting = false;
            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo eliminar el setting'
                : 'No se pudo eliminar el setting';
            void this.showToast(message, 'danger');
          });
        },
      });
  }

  private loadSettings(): void {
    if (!this.systemId) {
      return;
    }

    this.loading = true;
    this.loadError = null;
    this.isSettingModalOpen = false;
    this.selectedSettingId = null;
    this.settingModalSeed = null;

    this.api.get<{
      message: string;
      settings: { id: number; system_id: number; name: string; slug: string; description: string | null; active: boolean }[];
    }>(`game-systems/${this.systemId}/setting`)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.settings = Array.isArray(response?.settings) ? response.settings : [];
        },
        error: (error: unknown) => {
          this.loading = false;
          this.loadError =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudieron cargar los settings'
              : 'No se pudieron cargar los settings';
        },
      });
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}