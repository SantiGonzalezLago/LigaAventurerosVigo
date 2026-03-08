import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, homeSharp } from 'ionicons/icons';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs, TranslatePipe],
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, homeSharp });
  }
}