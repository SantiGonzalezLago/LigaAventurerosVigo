import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { MasterPageTemplate } from '../../../templates/master-page.template';
import { PageHeaderService } from '../../../services/page-header.service';

@Component({
  selector: 'app-master-control-panel',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './master-control-panel.page.html',
  styleUrls: ['./master-control-panel.page.scss'],
})
export class MasterControlPanelPage extends MasterPageTemplate {
  private readonly pageHeaderService = inject(PageHeaderService);

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Gestión de partidas');
  }
}
