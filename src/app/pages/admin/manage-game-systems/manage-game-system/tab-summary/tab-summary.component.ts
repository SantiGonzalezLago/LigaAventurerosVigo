import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  IonButton,
  IonInput,
  IonItem,
  IonToggle,
} from '@ionic/angular/standalone';
import { take } from 'rxjs';
import { FileUploadComponent } from '../../../../../components/file-upload/file-upload.component';
import { ApiService } from '../../../../../services/api.service';
import { PageHeaderService } from '../../../../../services/page-header.service';
import { UserService } from '../../../../../services/user.service';

@Component({
  selector: 'app-tab-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonItem,
    IonInput,
    IonToggle,
    FileUploadComponent,
  ],
  templateUrl: './tab-summary.component.html',
  styleUrls: ['./tab-summary.component.scss'],
})
export class TabSummaryComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly appRouter = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly userService = inject(UserService);

  @Input() slug = '';
  @Input() system: { id: number; name: string; slug: string; icon: string | null; pc_limit: number; active: boolean } | null = null;
  @Input() loading = false;
  @Output() slugUpdated = new EventEmitter<string>();

  isSaving = false;
  isFileUploadOpen = false;
  showErrors = false;

  systemId: number | null = null;
  nameDraft = '';
  slugDraft = '';
  iconPreviewUrl = '';
  activeDraft = true;
  pcLimitDraft = 0;
  iconFile: File | null = null;
  slugManuallyEdited = false;
  private originalIconUrl = '';
  private lastHydratedSystemId: number | null = null;
  private loadedSlug = '';

  ngOnChanges(changes: SimpleChanges): void {
    const incomingSystem = changes['system']?.currentValue as typeof this.system;
    if (!incomingSystem) {
      return;
    }

    if (incomingSystem.id === this.lastHydratedSystemId && this.systemId !== null) {
      return;
    }

    this.lastHydratedSystemId = incomingSystem.id;
    this.loadedSlug = incomingSystem.slug;
    this.systemId = incomingSystem.id;
    this.nameDraft = incomingSystem.name;
    this.slugDraft = incomingSystem.slug;
    this.iconPreviewUrl = incomingSystem.icon ?? '';
    this.originalIconUrl = incomingSystem.icon ?? '';
    this.activeDraft = !!incomingSystem.active;
    this.pcLimitDraft = incomingSystem.pc_limit ?? 0;
    this.iconFile = null;
    this.showErrors = false;
    this.isSaving = false;
    this.slugManuallyEdited = true;
  }

  onNameInput(): void {
    if (this.slugManuallyEdited) {
      return;
    }

    this.slugDraft = this.nameDraft
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-');
  }

  onSlugInput(): void {
    this.slugManuallyEdited = this.slugDraft.length > 0;
  }

  onFileSelected(event: { file: File; previewUrl: string; source: 'device' | 'url' }): void {
    this.iconFile = event.file;
    this.iconPreviewUrl = event.previewUrl;
    this.isFileUploadOpen = false;
  }

  onActiveChange(event: CustomEvent): void {
    this.activeDraft = !!event.detail?.checked;
  }

  saveSummary(): void {
    if (!this.systemId) {
      return;
    }

    if (!this.nameDraft.trim() || !this.slugDraft.trim()) {
      this.showErrors = true;
      return;
    }

    this.isSaving = true;
    const body: {
      name: string;
      slug: string;
      pc_limit: number;
      active: number;
      remove_icon?: string;
    } = {
      name: this.nameDraft.trim(),
      slug: this.slugDraft.trim(),
      pc_limit: this.pcLimitDraft,
      active: this.activeDraft ? 1 : 0,
    };

    const files: Record<string, File> = this.iconFile ? { icon: this.iconFile } : {};
    const hadIcon = !!this.originalIconUrl;
    const nowHasIcon = !!this.iconPreviewUrl;
    if (hadIcon && !nowHasIcon) {
      body.remove_icon = '1';
    }

    this.api.postWithFiles<{ message: string }, typeof body>(
      `game-systems/update/${this.systemId}`,
      body,
      files,
    ).pipe(take(1)).subscribe({
      next: async () => {
        this.isSaving = false;
        this.originalIconUrl = this.iconPreviewUrl;
        this.iconFile = null;
        this.loadedSlug = this.slugDraft.trim();
        this.pageHeaderService.setTitle(this.nameDraft.trim(), '/admin/game-systems');

        if (this.loadedSlug !== this.slug.trim()) {
          await this.appRouter.navigate(['/admin/game-systems', this.loadedSlug], { replaceUrl: true });
          this.slugUpdated.emit(this.loadedSlug);
        }

        await this.showToast('Sistema actualizado correctamente', 'success');
      },
      error: async (error: unknown) => {
        this.isSaving = false;

        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.userService.logout();
          return;
        }

        const errorMessage =
          error instanceof HttpErrorResponse
            ? error.error?.message ?? 'Error al guardar el sistema'
            : 'Error al guardar el sistema';
        await this.showToast(errorMessage, 'danger');
      },
    });
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
