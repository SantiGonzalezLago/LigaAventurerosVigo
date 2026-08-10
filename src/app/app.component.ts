import { Component, inject } from '@angular/core';
import {
  IonActionSheet,
  IonAlert,
  IonApp,
  IonPopover,
  IonRouterOutlet,
  IonToast,
} from '@ionic/angular/standalone';
import { AppMenuComponent } from './components/app-menu/app-menu.component';
import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { WhatsappQrModalComponent } from './components/whatsapp-qr-modal/whatsapp-qr-modal.component';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { ThemeService } from './services/theme.service';

interface LoginModalRequester {
  setLoginModalOpener(opener: () => void): void;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonActionSheet,
    IonAlert,
    IonApp,
    IonPopover,
    IonRouterOutlet,
    IonToast,
    AppMenuComponent,
    LoginModalComponent,
    SettingsModalComponent,
    WhatsappQrModalComponent,
    SplashScreenComponent,
  ],
})
export class AppComponent {
  private themeService = inject(ThemeService);
  public showSplash = true;
  public isLoginModalOpen = false;
  public isSettingsModalOpen = false;
  public isWhatsappQrModalOpen = false;
  public whatsappLink: string = '';
  public readonly loginModalOpener = () => this.openLoginModal();
  public readonly settingsModalOpener = () => this.openSettingsModal();
  public readonly whatsappQrModalOpener = (link: string) => this.openWhatsappQrModal(link);

  constructor() {
    void this.themeService;
  }

  public openLoginModal(): void {
    this.isLoginModalOpen = true;
  }

  public closeLoginModal(): void {
    this.isLoginModalOpen = false;
  }

  public openSettingsModal(): void {
    this.isSettingsModalOpen = true;
  }

  public closeSettingsModal(): void {
    this.isSettingsModalOpen = false;
  }

  public openWhatsappQrModal(whatsappLink?: string): void {
    if (whatsappLink) {
      this.whatsappLink = whatsappLink;
    }
    this.isWhatsappQrModalOpen = true;
  }

  public closeWhatsappQrModal(): void {
    this.isWhatsappQrModalOpen = false;
  }

  public onSplashDismissed(): void {
    this.showSplash = false;
  }

  public onRouteActivate(component: unknown): void {
    if (!this.isLoginModalRequester(component)) {
      return;
    }

    component.setLoginModalOpener(this.loginModalOpener);
  }

  private isLoginModalRequester(component: unknown): component is LoginModalRequester {
    return !!component && typeof (component as LoginModalRequester).setLoginModalOpener === 'function';
  }
}
