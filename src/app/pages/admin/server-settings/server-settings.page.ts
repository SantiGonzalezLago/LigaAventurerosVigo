import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, alertCircleOutline } from 'ionicons/icons';
import { take, catchError, of } from 'rxjs';
import { AdminPageTemplate } from '../../../templates/admin-page.template';
import { ApiService } from '../../../services/api.service';
import { PageHeaderService } from '../../../services/page-header.service';
import { LoaderComponent } from '../../../components/loader/loader.component';

addIcons({ checkmarkOutline, alertCircleOutline });

interface Setting {
  key: string;
  description: string | null;
  value: string;
}

@Component({
  selector: 'app-server-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, LoaderComponent],
  templateUrl: './server-settings.page.html',
  styleUrls: ['./server-settings.page.scss'],
})
export class ServerSettingsPage extends AdminPageTemplate {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);

  settings: Setting[] = [];
  drafts: Record<string, string> = {};
  saving: Record<string, boolean> = {};
  saveError: Record<string, string | null> = {};
  loading = false;
  error: string | null = null;
  tooltipKey: string | null = null;

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Configuraciones del servidor', '/admin');
    this.loadSettings();
  }

  private loadSettings(): void {
    this.loading = true;
    this.error = null;

    this.api.get<{ message: string; settings: Setting[] }>('admin/settings/get')
      .pipe(
        take(1),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.userService.logout();
          }
          return of<{ message: string; settings: Setting[] } | null>(null);
        })
      )
      .subscribe((response) => {
        this.loading = false;
        if (!response) {
          this.error = 'No se pudieron cargar las configuraciones.';
          return;
        }
        this.settings = response.settings;
        this.drafts = {};
        this.saving = {};
        this.saveError = {};
        for (const s of this.settings) {
          this.drafts[s.key] = s.value;
          this.saving[s.key] = false;
          this.saveError[s.key] = null;
        }
      });
  }

  isDirty(key: string): boolean {
    const original = this.settings.find((s) => s.key === key)?.value ?? '';
    return this.drafts[key] !== original;
  }

  save(key: string): void {
    if (!this.isDirty(key) || this.saving[key]) return;
    this.saving[key] = true;
    this.saveError[key] = null;

    this.api.post<{ message: string; key: string; value: string }, { key: string; value: string }>(
      'admin/settings/update',
      { key, value: this.drafts[key] }
    )
      .pipe(
        take(1),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.userService.logout();
          }
          const msg =
            err instanceof HttpErrorResponse && err.error?.message
              ? err.error.message
              : 'Error al guardar.';
          this.saveError[key] = msg;
          this.saving[key] = false;
          return of<{ message: string; key: string; value: string } | null>(null);
        })
      )
      .subscribe((response) => {
        if (!response) return;
        this.saving[key] = false;
        const setting = this.settings.find((s) => s.key === key);
        if (setting) {
          setting.value = response.value;
          this.drafts[key] = response.value;
        }
      });
  }

  showTooltip(key: string): void {
    this.tooltipKey = key;
  }

  hideTooltip(): void {
    this.tooltipKey = null;
  }

  retry(): void {
    this.loadSettings();
  }
}
