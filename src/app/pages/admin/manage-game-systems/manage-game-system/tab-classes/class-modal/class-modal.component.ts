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
import { closeOutline } from 'ionicons/icons';

addIcons({ closeOutline });

@Component({
  selector: 'app-class-modal',
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
  templateUrl: './class-modal.component.html',
  styleUrls: ['./class-modal.component.scss'],
})
export class ClassModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() seed: { id: number; name: string; active: boolean } | null = null;
  @Input() isSaving = false;
  @Input() isDeleting = false;

  @Output() close = new EventEmitter<void>();
  @Output() submitDraft = new EventEmitter<{ name: string; active: boolean }>();

  showErrors = false;

  draft = {
    name: '',
    active: true,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen']?.currentValue === true && changes['isOpen']?.previousValue !== true) || changes['seed'] || changes['mode']) {
      this.resetDraft();
    }
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

    if (!this.draft.name.trim()) {
      this.showErrors = true;
      return;
    }

    this.submitDraft.emit({
      name: this.draft.name,
      active: this.draft.active,
    });
  }

  private resetDraft(): void {
    this.draft = {
      name: this.seed?.name ?? '',
      active: this.seed?.active ?? true,
    };
    this.showErrors = false;
  }
}
