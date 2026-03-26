import { Component, inject } from '@angular/core';
import {
  IonBackButton,
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
  homeSharp,
  compass,
  logIn,
  personCircle,
  shieldCheckmark,
} from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { PageHeaderService } from '../../services/page-header.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonBackButton,
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
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly appName = environment.appName;
  public currentTitle = this.appName;
  public currentBackLink: string | null = null;
  private loginModalOpener: (() => void) | null = null;

  constructor() {
    addIcons({
      homeSharp,
      compass,
      logIn,
      shieldCheckmark,
      personCircle,
    });

    this.pageHeaderService.title$.subscribe((title) => {
      this.currentTitle = title ?? this.appName;
    });

    this.pageHeaderService.backLink$.subscribe((backLink) => {
      this.currentBackLink = backLink;
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

  public getActiveUserAvatar(): string | null {
    const avatar = this.userService.getActiveUser()?.avatar?.trim();
    return avatar ? avatar : null;
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