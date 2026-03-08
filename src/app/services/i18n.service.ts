import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private http = inject(HttpClient);

  private currentLanguage = new BehaviorSubject<string>('es');
  public currentLanguage$ = this.currentLanguage.asObservable();

  private translations: { [key in string]?: { [key: string]: any } } = {};
  private availableLanguages: string[] = ['es', 'gl', 'en'];
  private defaultLanguage: string = 'es';

  private languageLabels: { [key: string]: string } = {
    'system': 'common.system',
    'es': 'common.spanish',
    'gl': 'common.galician',
    'en': 'common.english'
  };

  constructor() {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    const savedLanguage = localStorage.getItem('language');
    const browserLanguage = this.getBrowserLanguage();
    const language = savedLanguage || browserLanguage || this.defaultLanguage;

    const langToUse = this.isValidLanguage(language) ? language : this.defaultLanguage;
    const languagesToLoad = langToUse === this.defaultLanguage
      ? [this.defaultLanguage]
      : [this.defaultLanguage, langToUse];

    forkJoin(languagesToLoad.map((lang) => this.loadLanguage(lang))).subscribe({
      next: () => {
        this.currentLanguage.next(langToUse);
      },
      error: () => {
        this.currentLanguage.next(this.defaultLanguage);
      },
    });
  }

  private getBrowserLanguage(): string | null {
    const browserLanguages = navigator.languages || [navigator.language];
    for (const lang of browserLanguages) {
      const part = lang.split('-')[0];
      if (this.availableLanguages.includes(part)) {
        return part;
      }
    }
    return null;
  }

  private isValidLanguage(language: string): boolean {
    return this.availableLanguages.includes(language);
  }

  public setLanguage(language: string): Observable<void> {
    // Si es "system", borra localStorage y usa el idioma del navegador
    if (language === 'system') {
      localStorage.removeItem('language');
      const browserLang = this.getBrowserLanguage();
      const langToUse = browserLang || this.defaultLanguage;

      if (this.translations[langToUse]) {
        this.currentLanguage.next(langToUse);
        return of(void 0);
      }

      return this.loadLanguage(langToUse).pipe(
        map(() => {
          this.currentLanguage.next(langToUse);
        })
      );
    }

    if (!this.isValidLanguage(language)) {
      language = this.defaultLanguage;
    }

    if (this.translations[language]) {
      this.currentLanguage.next(language);
      localStorage.setItem('language', language);
      return of(void 0);
    }

    return this.loadLanguage(language).pipe(
      map(() => {
        this.currentLanguage.next(language);
        localStorage.setItem('language', language);
      })
    );
  }

  private loadLanguage(language: string): Observable<void> {
    return this.http.get<any>(`assets/lang/${language}.json`).pipe(
      map(translations => {
        this.translations[language] = translations;
      })
    );
  }

  public get(key: string, params?: { [key: string]: string }): Observable<string> {
    return this.currentLanguage$.pipe(
      map(() => this.getTranslation(key, params))
    );
  }

  public instant(key: string, params?: { [key: string]: string }): string {
    return this.getTranslation(key, params);
  }

  private getTranslation(key: string, params?: { [key: string]: string }): string {
    const language = this.currentLanguage.value;
    const translations = this.translations[language] || {};

    let translation = this.getNestedTranslation(translations, key);

    if (!translation) {
      const fallbackTranslations = this.translations['es'] || {};
      translation = this.getNestedTranslation(fallbackTranslations, key);
    }

    if (!translation) {
      translation = key;
    }

    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{{${param}}}`, params[param]);
      });
    }

    return translation;
  }

  private getNestedTranslation(translations: any, key: string): string {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return '';
      }
    }

    return typeof value === 'string' ? value : '';
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage.value;
  }

  public getAvailableLanguages(): string[] {
    return this.availableLanguages;
  }

  public getLanguageOptions(): { value: string; label: string }[] {
    return [
      { value: 'system', label: this.languageLabels['system'] },
      ...this.availableLanguages.map(lang => ({
        value: lang,
        label: this.languageLabels[lang]
      }))
    ];
  }
}
