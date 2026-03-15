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
import { LoginModalComponent } from '../../components/login-modal/login-modal.component';
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
    LoginModalComponent,
  ],
})
export class TabsPage {
  userService = inject(UserService);
  isLoginModalOpen = false;
  appName = environment.appName;

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
    this.isLoginModalOpen = true;
  }

  public closeLoginModal(): void {
    this.isLoginModalOpen = false;
  }
}