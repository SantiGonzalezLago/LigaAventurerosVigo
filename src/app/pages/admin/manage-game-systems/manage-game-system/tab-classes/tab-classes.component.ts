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
import { ClassModalComponent } from './class-modal/class-modal.component';

addIcons({ addOutline, createOutline, trashOutline });

@Component({
  selector: 'app-tab-classes',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonFab,
    IonFabButton,
    IonIcon,
    LoaderComponent,
    ErrorStateComponent,
    ClassModalComponent,
  ],
  templateUrl: './tab-classes.component.html',
  styleUrls: ['./tab-classes.component.scss'],
})
export class TabClassesComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly ngZone = inject(NgZone);

  @Input() systemId: number | null = null;

  loading = false;
  saving = false;
  deleting = false;
  loadError: string | null = null;
  isClassModalOpen = false;
  classModalMode: 'create' | 'edit' = 'create';
  selectedClassId: number | null = null;
  classModalSeed: { id: number; name: string; active: boolean } | null = null;

  classes: { id: number; system_id: number; name: string; active: boolean }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['systemId']?.currentValue != null) {
      this.loadClasses();
    }
  }

  reloadClasses(): void {
    if (this.loading) {
      return;
    }

    this.loadClasses();
  }

  openCreateModal(): void {
    this.classModalMode = 'create';
    this.selectedClassId = null;
    this.classModalSeed = null;
    this.isClassModalOpen = true;
  }

  openEditModal(gameClass: { id: number; name: string; active: boolean }): void {
    this.classModalMode = 'edit';
    this.selectedClassId = gameClass.id;
    this.classModalSeed = {
      id: gameClass.id,
      name: gameClass.name,
      active: gameClass.active,
    };
    this.isClassModalOpen = true;
  }

  requestDeleteClass(gameClass: { id: number }): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.selectedClassId = gameClass.id;
    void this.deleteSelectedClass();
  }

  closeModal(): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.isClassModalOpen = false;
  }

  saveModal(draft: { name: string; active: boolean }): void {
    if (!this.systemId || this.saving) {
      return;
    }

    const body = {
      name: draft.name.trim(),
      active: draft.active,
    };

    this.saving = true;

    if (this.classModalMode === 'create') {
      this.api.post<{ message: string; id: number }, typeof body>(
        `game-systems/${this.systemId}/class/add`,
        body
      )
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.saving = false;
            this.isClassModalOpen = false;
            void this.showToast('Clase creada correctamente', 'success');
            this.loadClasses();
          },
          error: (error: unknown) => {
            this.saving = false;
            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo crear la clase'
                : 'No se pudo crear la clase';
            void this.showToast(message, 'danger');
          },
        });
      return;
    }

    if (!this.selectedClassId) {
      this.saving = false;
      return;
    }

    this.api.post<{ message: string }, typeof body>(
      `game-systems/${this.systemId}/class/${this.selectedClassId}/update`,
      body
    )
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.isClassModalOpen = false;
          void this.showToast('Clase actualizada', 'success');
          this.loadClasses();
        },
        error: (error: unknown) => {
          this.saving = false;
          const message =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudo actualizar la clase'
              : 'No se pudo actualizar la clase';
          void this.showToast(message, 'danger');
        },
      });
  }

  async deleteSelectedClass(): Promise<void> {
    if (!this.systemId || this.selectedClassId == null || this.deleting || this.saving) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar clase',
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
            this.confirmDeleteSelectedClass();
          },
        },
      ],
    });

    await alert.present();
  }

  private confirmDeleteSelectedClass(): void {
    if (!this.systemId || this.selectedClassId == null || this.deleting || this.saving) {
      return;
    }

    this.deleting = true;
    const deleteId = this.selectedClassId;

    this.api.delete<{ message: string }>(`game-systems/${this.systemId}/class/${deleteId}/delete`)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleting = false;
            this.isClassModalOpen = false;
            const deletedId = String(deleteId);
            this.classes = [...this.classes.filter((gameClass) => String(gameClass.id) !== deletedId)];
            this.selectedClassId = null;
            void this.showToast('Clase eliminada', 'success');
          });
        },
        error: (error: unknown) => {
          this.ngZone.run(() => {
            this.deleting = false;
            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo eliminar la clase'
                : 'No se pudo eliminar la clase';
            void this.showToast(message, 'danger');
          });
        },
      });
  }

  private loadClasses(): void {
    if (!this.systemId) {
      return;
    }

    this.loading = true;
    this.loadError = null;
    this.isClassModalOpen = false;
    this.selectedClassId = null;
    this.classModalSeed = null;

    this.api.get<{
      message: string;
      classes: { id: number; system_id: number; name: string; active: boolean }[];
    }>(`game-systems/${this.systemId}/class`)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.classes = Array.isArray(response?.classes) ? response.classes : [];
        },
        error: (error: unknown) => {
          this.loading = false;
          this.loadError =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudieron cargar las clases'
              : 'No se pudieron cargar las clases';
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
