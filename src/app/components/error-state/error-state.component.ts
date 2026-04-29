import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';

addIcons({ alertCircleOutline });

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './error-state.component.html',
  styleUrls: ['./error-state.component.scss'],
})
export class ErrorStateComponent {
  @Input() message = 'Ha ocurrido un error.';
  @Input() retryLabel = 'Reintentar';

  @Output() retry = new EventEmitter<void>();

  public onRetry(): void {
    this.retry.emit();
  }
}
