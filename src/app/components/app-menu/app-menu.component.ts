import { Component, inject, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { moonOutline, phonePortraitOutline, sunnyOutline } from 'ionicons/icons';
import { ActionSheetController } from '@ionic/angular';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ThemeMode, ThemeService } from 'src/app/services/theme.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from '../../../environments/environment';
import { KofiSupportCardComponent } from '../kofi-support-card/kofi-support-card.component';

addIcons({ moonOutline, phonePortraitOutline, sunnyOutline });

@Component({
  selector: 'app-menu',
  templateUrl: 'app-menu.component.html',
  styleUrls: ['app-menu.component.scss'],
  imports: [
    AsyncPipe,
    IonContent,
    IonFooter,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar,
    KofiSupportCardComponent,
  ],
})
export class AppMenuComponent {
  private themeService = inject(ThemeService);
  private actionSheetCtrl = inject(ActionSheetController);
  private userService = inject(UserService);
  @Input() loginModalOpener: (() => void) | null = null;

  currentTheme: ThemeMode = 'system';
  themeOptions: { value: ThemeMode; label: string }[] = [];
  appVersion = environment.version;
  appName = environment.appName;
  users$ = this.userService.users$;
  activeUid$ = this.userService.activeUid$;

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

  public openLoginModal(): void {
    this.loginModalOpener?.();
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