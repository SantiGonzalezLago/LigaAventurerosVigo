import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, pencilOutline } from 'ionicons/icons';
import { take } from 'rxjs';
import { AdminPageTemplate } from '../../../templates/admin-page.template';
import { ApiService } from '../../../services/api.service';
import { PageHeaderService } from '../../../services/page-header.service';
import { LoaderComponent } from '../../../components/loader/loader.component';
import { ErrorStateComponent } from '../../../components/error-state/error-state.component';
import { GameSystemModalComponent } from './game-system-modal/game-system-modal.component';

addIcons({ addOutline, pencilOutline });

@Component({
  selector: 'app-manage-game-systems',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    LoaderComponent,
    ErrorStateComponent,
    GameSystemModalComponent,
  ],
  templateUrl: './manage-game-systems.page.html',
  styleUrls: ['./manage-game-systems.page.scss'],
})
export class ManageGameSystemsPage extends AdminPageTemplate implements OnInit {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);

  loading = false;
  error: string | null = null;
  systems: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean }[] = [];

  modalRequest: {
    system: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean } | null;
    eventId: number;
  } | null = null;
  private modalEventId = 0;

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Configurar sistemas', '/admin');
    this.loadSystems();
  }

  ngOnInit(): void {}

  loadSystems(): void {
    this.loading = true;
    this.error = null;

    this.api.get<{
      message: string;
      game_systems: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean }[];
    }>('game-systems')
      .pipe(
        take(1),
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.systems = this.sortSystems(response.game_systems);
        },
        error: (err: unknown) => {
          this.loading = false;
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.userService.logout();
            return;
          }
          this.error = 'No se pudieron cargar los sistemas de juego';
        },
      });
  }

  openNewSystemModal(): void {
    this.modalEventId += 1;
    this.modalRequest = { system: null, eventId: this.modalEventId };
  }

  openEditSystemModal(system: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean }): void {
    this.modalEventId += 1;
    this.modalRequest = { system, eventId: this.modalEventId };
  }

  onModalSaved(data: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean; isNew: boolean }): void {
    if (data.isNew) {
      this.systems = this.sortSystems([
        ...this.systems,
        { id: data.id, name: data.name, slug: data.slug, icon: data.icon, pc_limit: data.pc_limit, active: data.active },
      ]);
    } else {
      this.systems = this.sortSystems(this.systems.map((s) =>
        s.id === data.id ? { ...s, name: data.name, slug: data.slug, icon: data.icon, pc_limit: data.pc_limit, active: data.active } : s
      ));
    }
  }

  private sortSystems(
    systems: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean }[]
  ): { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean }[] {
    return [...systems].sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return a.id - b.id;
    });
  }

}
