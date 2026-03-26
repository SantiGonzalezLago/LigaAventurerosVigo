import { Component, inject } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { IonContent } from '@ionic/angular/standalone';
import { PublicPageTemplate } from 'src/app/templates/public-page.template';
import { PageHeaderService } from '../../services/page-header.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent],
})
export class HomePage extends PublicPageTemplate {
  private readonly pageHeaderService = inject(PageHeaderService);

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle();
  }
}
