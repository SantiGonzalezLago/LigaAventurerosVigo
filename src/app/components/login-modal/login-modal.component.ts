import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  IonButton,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  imports: [IonButton, IonHeader, IonInput, IonItem, IonModal, IonTitle, IonToolbar],
})
export class LoginModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  public onDidDismiss(): void {
    this.close.emit();
  }
}
