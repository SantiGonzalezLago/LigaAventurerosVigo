import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AppMenuComponent } from './components/app-menu/app-menu.component';
import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { ThemeService } from './services/theme.service';

interface LoginModalRequester {
  setLoginModalOpener(opener: () => void): void;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, AppMenuComponent, LoginModalComponent],
})
export class AppComponent {
  private themeService = inject(ThemeService);
  public isLoginModalOpen = false;
  public readonly loginModalOpener = () => this.openLoginModal();

  constructor() {
    void this.themeService;
  }

  public openLoginModal(): void {
    this.isLoginModalOpen = true;
  }

  public closeLoginModal(): void {
    this.isLoginModalOpen = false;
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
