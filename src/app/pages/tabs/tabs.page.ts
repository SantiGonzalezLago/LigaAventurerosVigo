import { Component, inject } from '@angular/core';
import {
  IonButtons,
  IonHeader,
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  homeSharp,
  logIn,
  logInOutline,
  personCircle,
  personCircleOutline,
  shieldCheckmark,
  shieldCheckmarkOutline,
  star,
  starOutline,
} from 'ionicons/icons';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonButtons,
    IonHeader,
    IonIcon,
    IonLabel,
    IonMenuButton,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonTitle,
    IonToolbar,
  ],
})
export class TabsPage {
  userService = inject(UserService);
  appName = environment.appName;
  private loginModalOpener: (() => void) | null = null;

  constructor() {
    addIcons({
      homeOutline,
      homeSharp,
      logInOutline,
      logIn,
      starOutline,
      star,
      shieldCheckmarkOutline,
      shieldCheckmark,
      personCircleOutline,
      personCircle,
    });
  }

  public canViewMasterTab(): boolean {
    return this.userService.hasMasterAccess();
  }

  public canViewAdminTab(): boolean {
    return this.userService.hasAdminAccess();
  }

  public isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
  }

  public onLoginTabClick(event: Event): void {
    event.preventDefault();
    this.openLoginModal();
  }

  public openLoginModal(): void {
    this.loginModalOpener?.();
  }

  public setLoginModalOpener(opener: () => void): void {
    this.loginModalOpener = opener;
  }
}