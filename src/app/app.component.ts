import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AppMenuComponent } from './components/app-menu/app-menu.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, AppMenuComponent],
})
export class AppComponent {
  private themeService = inject(ThemeService);

  constructor() {
    // Keep service referenced so initialization runs at bootstrap.
    void this.themeService;
  }
}
