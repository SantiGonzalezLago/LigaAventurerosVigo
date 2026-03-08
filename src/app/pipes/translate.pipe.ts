import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { I18nService } from '../services/i18n.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'i18n',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private subscription: Subscription | null = null;
  private lastKey: string = '';
  private lastParams?: { [key: string]: string };
  private lastValue: string = '';

  constructor(
    private i18nService: I18nService,
    private cdr: ChangeDetectorRef
  ) {}

  transform(key: string, params?: { [key: string]: string }): string {
    // Si la clave o los parámetros cambiaron, actualizamos la traducción
    if (key !== this.lastKey || JSON.stringify(params) !== JSON.stringify(this.lastParams)) {
      this.lastKey = key;
      this.lastParams = params;
      this.lastValue = this.i18nService.instant(key, params);

      // Nos subscribimos al cambio de idioma para actualizar la vista
      if (!this.subscription) {
        this.subscription = this.i18nService.currentLanguage$.subscribe(() => {
          this.lastValue = this.i18nService.instant(key, params);
          this.cdr.markForCheck();
        });
      }
    }

    return this.lastValue;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

