import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { AdminPageTemplate } from '../../../templates/admin-page.template';
import { ApiService } from '../../../services/api.service';
import { PageHeaderService } from '../../../services/page-header.service';

@Component({
  selector: 'app-admin-control-panel',
  standalone: true,
  imports: [CommonModule, IonContent, RouterLink],
  templateUrl: './admin-control-panel.page.html',
  styleUrls: ['./admin-control-panel.page.scss'],
})
export class AdminControlPanelPage extends AdminPageTemplate {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);

  users = {
    confirmed: 0,
    unconfirmed: 0,
    banned: 0,
  };

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Administración');

    this.api.get<{
      message: string;
      users: {
        confirmed: number;
        unconfirmed: number;
        banned: number;
      };
    }>('admin/control-panel')
      .pipe(
        take(1),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.userService.logout();
          }

          return of<{
            message: string;
            users: {
              confirmed: number;
              unconfirmed: number;
              banned: number;
            };
          } | null>(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.users = {
          confirmed: response.users?.confirmed ?? 0,
          unconfirmed: response.users?.unconfirmed ?? 0,
          banned: response.users?.banned ?? 0,
        };
      });
  }
}
