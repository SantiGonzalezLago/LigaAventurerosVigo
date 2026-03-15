import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-kofi-support-card',
  templateUrl: './kofi-support-card.component.html',
  styleUrls: ['./kofi-support-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class KofiSupportCardComponent {
  @Input() title: string = '¡Apóyanos en Ko-fi!';
  @Input() avatarSrc: string = 'assets/images/avatar.png';
  @Input() kofiIconSrc: string = 'assets/images/kofi.png';

  href: string = '';
  displayUrl: string = '';

  constructor() {
    this.displayUrl = environment.kofi;
    this.href = `https://${environment.kofi}`;
  }
}
