import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonButtons, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

addIcons({ closeOutline });

@Component({
  selector: 'app-whatsapp-qr-modal',
  standalone: true,
  imports: [CommonModule, IonButton, IonButtons, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar],
  templateUrl: './whatsapp-qr-modal.component.html',
  styleUrls: ['./whatsapp-qr-modal.component.scss'],
})
export class WhatsappQrModalComponent {
  @Input() isOpen = false;
  @Input() whatsappLink: string = '';
  @Output() close = new EventEmitter<void>();

  closeModal(): void {
    this.close.emit();
  }

  onDidDismiss(): void {
    this.close.emit();
  }

  getWhatsappQrUrl(): string {
    if (!this.whatsappLink) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.whatsappLink)}`;
  }
}
