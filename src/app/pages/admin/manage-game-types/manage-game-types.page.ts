import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, NgZone, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';
import { take } from 'rxjs';
import { ErrorStateComponent } from '../../../components/error-state/error-state.component';
import { LoaderComponent } from '../../../components/loader/loader.component';
import { ApiService } from '../../../services/api.service';
import { PageHeaderService } from '../../../services/page-header.service';
import { AdminPageTemplate } from '../../../templates/admin-page.template';
import { GameTypeModalComponent } from './game-type-modal/game-type-modal.component';

addIcons({ addOutline, createOutline, trashOutline });

@Component({
  selector: 'app-manage-game-types',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonFab,
    IonFabButton,
    IonIcon,
    LoaderComponent,
    ErrorStateComponent,
    GameTypeModalComponent,
  ],
  templateUrl: './manage-game-types.page.html',
  styleUrls: ['./manage-game-types.page.scss'],
})
export class ManageGameTypesPage extends AdminPageTemplate {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly ngZone = inject(NgZone);

  loading = false;
  saving = false;
  deleting = false;
  loadError: string | null = null;

  isGameTypeModalOpen = false;
  gameTypeModalMode: 'create' | 'edit' = 'create';
  selectedGameTypeId: number | null = null;
  gameTypeModalSeed: { id: number; name: string; active: boolean } | null = null;

  gameTypes: { id: number; name: string; active: boolean }[] = [];

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Tipos de partida', '/admin');
    this.loadGameTypes();
  }

  reloadGameTypes(): void {
    if (this.loading) {
      return;
    }

    this.loadGameTypes();
  }

  openCreateModal(): void {
    this.gameTypeModalMode = 'create';
    this.selectedGameTypeId = null;
    this.gameTypeModalSeed = null;
    this.isGameTypeModalOpen = true;
  }

  openEditModal(gameType: { id: number; name: string; active: boolean }): void {
    this.gameTypeModalMode = 'edit';
    this.selectedGameTypeId = gameType.id;
    this.gameTypeModalSeed = {
      id: gameType.id,
      name: gameType.name,
      active: gameType.active,
    };
    this.isGameTypeModalOpen = true;
  }

  requestDeleteGameType(gameType: { id: number }): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.selectedGameTypeId = gameType.id;
    void this.deleteSelectedGameType();
  }

  closeModal(): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.isGameTypeModalOpen = false;
  }

  saveModal(draft: { name: string; active: boolean }): void {
    if (this.saving) {
      return;
    }

    const body = {
      name: draft.name.trim(),
      active: draft.active,
    };

    this.saving = true;

    if (this.gameTypeModalMode === 'create') {
      this.api.post<{ message: string; id: number }, typeof body>(
        'game-types/add',
        body
      )
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.saving = false;
            this.isGameTypeModalOpen = false;
            void this.showToast('Tipo de partida creado correctamente', 'success');
            this.loadGameTypes();
          },
          error: (error: unknown) => {
            this.saving = false;
            if (error instanceof HttpErrorResponse && error.status === 401) {
              this.userService.logout();
              return;
            }

            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo crear el tipo de partida'
                : 'No se pudo crear el tipo de partida';
            void this.showToast(message, 'danger');
          },
        });
      return;
    }

    if (!this.selectedGameTypeId) {
      this.saving = false;
      return;
    }

    this.api.post<{ message: string }, typeof body>(
      `game-types/${this.selectedGameTypeId}/update`,
      body
    )
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.isGameTypeModalOpen = false;
          void this.showToast('Tipo de partida actualizado', 'success');
          this.loadGameTypes();
        },
        error: (error: unknown) => {
          this.saving = false;
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.userService.logout();
            return;
          }

          const message =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudo actualizar el tipo de partida'
              : 'No se pudo actualizar el tipo de partida';
          void this.showToast(message, 'danger');
        },
      });
  }

  async deleteSelectedGameType(): Promise<void> {
    if (this.selectedGameTypeId == null || this.deleting || this.saving) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar tipo de partida',
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
            this.confirmDeleteSelectedGameType();
          },
        },
      ],
    });

    await alert.present();
  }

  private confirmDeleteSelectedGameType(): void {
    if (this.selectedGameTypeId == null || this.deleting || this.saving) {
      return;
    }

    this.deleting = true;
    const deleteId = this.selectedGameTypeId;

    this.api.delete<{ message: string }>(`game-types/${deleteId}/delete`)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleting = false;
            this.isGameTypeModalOpen = false;
            const deletedId = String(deleteId);
            this.gameTypes = [...this.gameTypes.filter((gameType) => String(gameType.id) !== deletedId)];
            this.selectedGameTypeId = null;
            void this.showToast('Tipo de partida eliminado', 'success');
          });
        },
        error: (error: unknown) => {
          this.ngZone.run(() => {
            this.deleting = false;
            if (error instanceof HttpErrorResponse && error.status === 401) {
              this.userService.logout();
              return;
            }

            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo eliminar el tipo de partida'
                : 'No se pudo eliminar el tipo de partida';
            void this.showToast(message, 'danger');
          });
        },
      });
  }

  private loadGameTypes(): void {
    this.loading = true;
    this.loadError = null;
    this.isGameTypeModalOpen = false;
    this.selectedGameTypeId = null;
    this.gameTypeModalSeed = null;

    this.api.get<{
      message: string;
      game_types: { id: number; name: string; active: boolean }[];
    }>('game-types')
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.gameTypes = this.sortGameTypes(Array.isArray(response?.game_types) ? response.game_types : []);
        },
        error: (error: unknown) => {
          this.loading = false;
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.userService.logout();
            return;
          }

          this.loadError =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudieron cargar los tipos de partida'
              : 'No se pudieron cargar los tipos de partida';
        },
      });
  }

  private sortGameTypes(gameTypes: { id: number; name: string; active: boolean }[]): { id: number; name: string; active: boolean }[] {
    return [...gameTypes].sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return a.id - b.id;
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