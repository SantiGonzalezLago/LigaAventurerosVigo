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
import { SpeciesModalComponent } from './species-modal/species-modal.component';

addIcons({ addOutline, createOutline, trashOutline });

@Component({
  selector: 'app-tab-species',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonFab,
    IonFabButton,
    IonIcon,
    LoaderComponent,
    ErrorStateComponent,
    SpeciesModalComponent,
  ],
  templateUrl: './tab-species.component.html',
  styleUrls: ['./tab-species.component.scss'],
})
export class TabSpeciesComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly ngZone = inject(NgZone);

  @Input() systemId: number | null = null;

  loading = false;
  saving = false;
  deleting = false;
  loadError: string | null = null;
  isSpeciesModalOpen = false;
  speciesModalMode: 'create' | 'edit' = 'create';
  selectedSpeciesId: number | null = null;
  speciesModalSeed: { id: number; name: string; active: boolean } | null = null;

  species: { id: number; system_id: number; name: string; active: boolean }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['systemId']?.currentValue != null) {
      this.loadSpecies();
    }
  }

  reloadSpecies(): void {
    if (this.loading) {
      return;
    }

    this.loadSpecies();
  }

  openCreateModal(): void {
    this.speciesModalMode = 'create';
    this.selectedSpeciesId = null;
    this.speciesModalSeed = null;
    this.isSpeciesModalOpen = true;
  }

  openEditModal(specie: { id: number; name: string; active: boolean }): void {
    this.speciesModalMode = 'edit';
    this.selectedSpeciesId = specie.id;
    this.speciesModalSeed = {
      id: specie.id,
      name: specie.name,
      active: specie.active,
    };
    this.isSpeciesModalOpen = true;
  }

  requestDeleteSpecies(specie: { id: number }): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.selectedSpeciesId = specie.id;
    void this.deleteSelectedSpecies();
  }

  closeModal(): void {
    if (this.saving || this.deleting) {
      return;
    }

    this.isSpeciesModalOpen = false;
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

    if (this.speciesModalMode === 'create') {
      this.api.post<{ message: string; id: number }, typeof body>(
        `game-systems/${this.systemId}/species/add`,
        body
      )
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.saving = false;
            this.isSpeciesModalOpen = false;
            void this.showToast('Especie creada correctamente', 'success');
            this.loadSpecies();
          },
          error: (error: unknown) => {
            this.saving = false;
            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo crear la especie'
                : 'No se pudo crear la especie';
            void this.showToast(message, 'danger');
          },
        });
      return;
    }

    if (!this.selectedSpeciesId) {
      this.saving = false;
      return;
    }

    this.api.post<{ message: string }, typeof body>(
      `game-systems/${this.systemId}/species/${this.selectedSpeciesId}/update`,
      body
    )
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.isSpeciesModalOpen = false;
          void this.showToast('Especie actualizada', 'success');
          this.loadSpecies();
        },
        error: (error: unknown) => {
          this.saving = false;
          const message =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudo actualizar la especie'
              : 'No se pudo actualizar la especie';
          void this.showToast(message, 'danger');
        },
      });
  }

  async deleteSelectedSpecies(): Promise<void> {
    if (!this.systemId || this.selectedSpeciesId == null || this.deleting || this.saving) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar especie',
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
            this.confirmDeleteSelectedSpecies();
          },
        },
      ],
    });

    await alert.present();
  }

  private confirmDeleteSelectedSpecies(): void {
    if (!this.systemId || this.selectedSpeciesId == null || this.deleting || this.saving) {
      return;
    }

    this.deleting = true;
    const deleteId = this.selectedSpeciesId;

    this.api.delete<{ message: string }>(`game-systems/${this.systemId}/species/${deleteId}/delete`)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleting = false;
            this.isSpeciesModalOpen = false;
            const deletedId = String(deleteId);
            this.species = [...this.species.filter((specie) => String(specie.id) !== deletedId)];
            this.selectedSpeciesId = null;
            void this.showToast('Especie eliminada', 'success');
          });
        },
        error: (error: unknown) => {
          this.ngZone.run(() => {
            this.deleting = false;
            const message =
              error instanceof HttpErrorResponse
                ? error.error?.message ?? 'No se pudo eliminar la especie'
                : 'No se pudo eliminar la especie';
            void this.showToast(message, 'danger');
          });
        },
      });
  }

  private loadSpecies(): void {
    if (!this.systemId) {
      return;
    }

    this.loading = true;
    this.loadError = null;
    this.isSpeciesModalOpen = false;
    this.selectedSpeciesId = null;
    this.speciesModalSeed = null;

    this.api.get<{
      message: string;
      species: { id: number; system_id: number; name: string; active: boolean }[];
    }>(`game-systems/${this.systemId}/species`)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.species = Array.isArray(response?.species) ? response.species : [];
        },
        error: (error: unknown) => {
          this.loading = false;
          this.loadError =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudieron cargar las especies'
              : 'No se pudieron cargar las especies';
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
