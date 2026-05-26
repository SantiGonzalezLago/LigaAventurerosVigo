import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  IonContent,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { take } from 'rxjs';
import { AdminPageTemplate } from '../../../../templates/admin-page.template';
import { ApiService } from '../../../../services/api.service';
import { PageHeaderService } from '../../../../services/page-header.service';
import { LoaderComponent } from '../../../../components/loader/loader.component';
import { TabSettingsComponent } from './tab-settings/tab-settings.component';
import { TabSummaryComponent } from './tab-summary/tab-summary.component';
import { TabTiersComponent } from './tab-tiers/tab-tiers.component';
import { TabSpeciesComponent } from './tab-species/tab-species.component';
import { TabClassesComponent } from './tab-classes/tab-classes.component';

@Component({
  selector: 'app-manage-game-system',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    LoaderComponent,
    TabSettingsComponent,
    TabSummaryComponent,
    TabTiersComponent,
    TabSpeciesComponent,
    TabClassesComponent,
  ],
  templateUrl: './manage-game-system.page.html',
  styleUrls: ['./manage-game-system.page.scss'],
})
export class ManageGameSystemPage extends AdminPageTemplate {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly appRouter = inject(Router);
  private readonly toastController = inject(ToastController);

  selectedTab = 'summary';
  systemSlug = 'sistema';
  loadingSystem = false;
  system: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean } | null = null;

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();

    const routeSlug = this.route.snapshot.paramMap.get('slug');
    if (!routeSlug?.trim()) {
      void this.showErrorAndRedirect('Sistema no encontrado');
      return;
    }

    this.systemSlug = routeSlug.trim();
    this.system = null;
    this.pageHeaderService.setTitle(this.systemSlug, '/admin/game-systems');
    this.loadSystem(this.systemSlug);
  }

  onTabChange(event: CustomEvent): void {
    const tab = event.detail?.value;
    if (typeof tab === 'string' && tab.trim()) {
      this.selectedTab = tab;
    }
  }

  onSystemSlugUpdated(slug: string): void {
    if (!slug.trim()) {
      return;
    }

    this.systemSlug = slug.trim();
  }

  private loadSystem(slug: string): void {
    this.loadingSystem = true;

    this.api.get<{
      message: string;
      game_system: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean };
    }>(`game-systems/${encodeURIComponent(slug)}`)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.loadingSystem = false;
          const loadedSystem = response?.game_system;
          const systemName = loadedSystem?.name?.trim();
          if (!loadedSystem || !systemName) {
            void this.showErrorAndRedirect('Sistema no encontrado');
            return;
          }

          this.system = loadedSystem;
          this.pageHeaderService.setTitle(systemName, '/admin/game-systems');
        },
        error: (error: unknown) => {
          this.loadingSystem = false;

          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.userService.logout();
            return;
          }

          const errorMessage =
            error instanceof HttpErrorResponse
              ? error.error?.message ?? 'No se pudo cargar el sistema'
              : 'No se pudo cargar el sistema';
          void this.showErrorAndRedirect(errorMessage);
        },
      });
  }

  private async showErrorAndRedirect(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
    await this.appRouter.navigate(['/admin/game-systems']);
  }
}
