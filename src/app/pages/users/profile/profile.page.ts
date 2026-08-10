import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { PublicPageTemplate } from '../../../templates/public-page.template';
import { PageHeaderService } from '../../../services/page-header.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage extends PublicPageTemplate {
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  uid:string | null = null;

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Perfil');

    const routeUid = this.route.snapshot.paramMap.get('uid');
    if (!routeUid?.trim()) {
      this.uid = this.userService.getActiveUid();
    } else {
      this.uid = routeUid;
    }

    if (!this.uid) {
      this.router.navigate(['/home']);
    }
  }

  isOwnProfile(): boolean {
    return this.uid === this.userService.getActiveUid();
  }
}
