import { Component, inject } from '@angular/core';
import { addIcons } from 'ionicons';
import { moonOutline, phonePortraitOutline, sunnyOutline } from 'ionicons/icons';
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
import { ThemeMode, ThemeService } from 'src/app/services/theme.service';
import { environment } from '../../../environments/environment';

addIcons({ moonOutline, phonePortraitOutline, sunnyOutline });

@Component({
  selector: 'app-menu',
  templateUrl: 'app-menu.component.html',
  styleUrls: ['app-menu.component.scss'],
  imports: [
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
  private themeService = inject(ThemeService);
  private actionSheetCtrl = inject(ActionSheetController);

  currentTheme: ThemeMode = 'system';
  themeOptions: { value: ThemeMode; label: string }[] = [];
  appVersion = environment.version;
  appName = environment.appName;

  ngOnInit(): void {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.themeOptions = this.themeService.getThemeOptions();

    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  async openThemeSelector(): Promise<void> {
    const buttons = this.themeOptions.map((theme) => {
      const isActive = theme.value === this.currentTheme;

      return {
        text: theme.label,
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
          text: 'Cancelar',
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