import { Component, inject } from '@angular/core';
import { addIcons } from 'ionicons';
import { globeOutline, moonOutline, phonePortraitOutline, sunnyOutline } from 'ionicons/icons';
import { I18nService } from '../../services/i18n.service';
import { ActionSheetController } from '@ionic/angular';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ThemeMode, ThemeService } from 'src/app/services/theme.service';
import { environment } from '../../../environments/environment';

addIcons({ globeOutline, moonOutline, phonePortraitOutline, sunnyOutline });

@Component({
  selector: 'app-menu',
  templateUrl: 'app-menu.component.html',
  styleUrls: ['app-menu.component.scss'],
  imports: [
    TranslatePipe,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar,
  ],
})
export class AppMenuComponent {
  private i18nService = inject(I18nService);
  private themeService = inject(ThemeService);
  private actionSheetCtrl = inject(ActionSheetController);

  availableLanguages: string[] = [];
  currentLanguage: string = 'es';
  languageOptions: { value: string; label: string }[] = [];
  currentTheme: ThemeMode = 'system';
  themeOptions: { value: ThemeMode; label: string }[] = [];
  appVersion = environment.version;

  ngOnInit(): void {
    this.availableLanguages = this.i18nService.getAvailableLanguages();
    this.currentLanguage = this.i18nService.getCurrentLanguage();
    this.languageOptions = this.i18nService.getLanguageOptions();
    this.currentTheme = this.themeService.getCurrentTheme();
    this.themeOptions = this.themeService.getThemeOptions();

    this.i18nService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
    });

    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  async openLanguageSelector(): Promise<void> {
    const isSystemDefault = !localStorage.getItem('language');

    const buttons = this.languageOptions.map(lang => {
      const isActive = isSystemDefault && lang.value === 'system' || !isSystemDefault && lang.value === this.currentLanguage;
      const label = this.i18nService.instant(lang.label);

      return {
        text: label,
        icon: lang.value === 'system' ? 'globe-outline' : undefined,
        cssClass: this.getLanguageButtonClasses(lang.value, isActive),
        handler: () => {
          this.i18nService.setLanguage(lang.value).subscribe();
        }
      };
    });

    const actionSheet = await this.actionSheetCtrl.create({
      buttons: [
        ...buttons,
        {
          text: this.i18nService.instant('common.cancel'),
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private getLanguageButtonClasses(languageValue: string, isActive: boolean): string {
    const classes = ['lang-option', `lang-${languageValue}`];

    if (isActive) {
      classes.push('active-language');
    }

    return classes.join(' ');
  }

  async openThemeSelector(): Promise<void> {
    const buttons = this.themeOptions.map((theme) => {
      const isActive = theme.value === this.currentTheme;
      const label = this.i18nService.instant(theme.label);

      return {
        text: label,
        icon: this.getThemeIcon(theme.value),
        cssClass: this.getThemeButtonClasses(theme.value, isActive),
        handler: () => {
          this.themeService.setTheme(theme.value);
        },
      };
    });

    const actionSheet = await this.actionSheetCtrl.create({
      buttons: [
        ...buttons,
        {
          text: this.i18nService.instant('common.cancel'),
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  private getThemeButtonClasses(themeValue: ThemeMode, isActive: boolean): string {
    const classes = ['theme-option', `theme-${themeValue}`];

    if (isActive) {
      classes.push('active-theme');
    }

    return classes.join(' ');
  }

  private getThemeIcon(theme: ThemeMode): string {
    if (theme === 'light') {
      return 'sunny-outline';
    }

    if (theme === 'dark') {
      return 'moon-outline';
    }

    return 'phone-portrait-outline';
  }

}