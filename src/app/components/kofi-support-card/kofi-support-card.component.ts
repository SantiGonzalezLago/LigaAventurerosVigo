import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Input() set kofiLink(value: string) {
    const normalized = this.normalizeUrl(value ?? '');
    this.href = normalized;
    this.displayUrl = normalized.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  href: string = '';
  displayUrl: string = '';

  private normalizeUrl(url: string): string {
    const trimmed = url.trim();

    if (!trimmed) {
      return '';
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }
}
