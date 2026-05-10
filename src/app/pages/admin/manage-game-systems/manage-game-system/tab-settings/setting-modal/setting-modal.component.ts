import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, trashOutline } from 'ionicons/icons';

addIcons({ closeOutline, trashOutline });

@Component({
  selector: 'app-setting-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonItem,
    IonInput,
    IonIcon,
    IonToggle,
  ],
  templateUrl: './setting-modal.component.html',
  styleUrls: ['./setting-modal.component.scss'],
})
export class SettingModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() seed: { id: number; name: string; slug: string; description: string | null; active: boolean } | null = null;
  @Input() isSaving = false;
  @Input() isDeleting = false;

  @Output() close = new EventEmitter<void>();
  @Output() submitDraft = new EventEmitter<{ name: string; slug: string; description: string; active: boolean }>();

  showErrors = false;
  slugManuallyEdited = false;

  draft = {
    name: '',
    slug: '',
    description: '',
    active: true,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen']?.currentValue === true && changes['isOpen']?.previousValue !== true) || changes['seed'] || changes['mode']) {
      this.resetDraft();
    }
  }

  onNameInput(): void {
    if (this.slugManuallyEdited) {
      return;
    }

    this.draft.slug = this.toSlug(this.draft.name);
  }

  onSlugInput(): void {
    this.slugManuallyEdited = this.draft.slug.trim().length > 0;
  }

  onActiveChange(event: CustomEvent): void {
    this.draft.active = !!event.detail?.checked;
  }

  onClose(): void {
    if (this.isSaving || this.isDeleting) {
      return;
    }

    this.close.emit();
  }

  onDidDismiss(): void {
    this.onClose();
  }

  onSubmit(): void {
    if (this.isSaving || this.isDeleting) {
      return;
    }

    if (!this.draft.name.trim() || !this.draft.slug.trim()) {
      this.showErrors = true;
      return;
    }

    this.submitDraft.emit({
      name: this.draft.name,
      slug: this.draft.slug,
      description: this.draft.description,
      active: this.draft.active,
    });
  }

  private resetDraft(): void {
    this.draft = {
      name: this.seed?.name ?? '',
      slug: this.seed?.slug ?? '',
      description: this.seed?.description ?? '',
      active: this.seed?.active ?? true,
    };
    this.slugManuallyEdited = this.mode === 'edit';
    this.showErrors = false;
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
