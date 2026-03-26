import { Directive, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ViewDidLeave, ViewWillEnter } from '@ionic/angular';
import { UserService } from '../services/user.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive()
export abstract class MasterPageTemplate implements ViewWillEnter, ViewDidLeave, OnDestroy {
  protected userService: UserService;
  private router: Router;
  private destroy$ = new Subject<void>();
  private viewActiveDestroy$ = new Subject<void>();

  constructor(userService: UserService, router: Router) {
    this.userService = userService;
    this.router = router;
  }

  ionViewWillEnter(): void {
    this.resetViewSubscriptionScope();

    if (!this.userService.hasMasterAccess()) {
      this.router.navigate(['/home']);
      return;
    }

    this.userService.activeUid$
      .pipe(takeUntil(this.destroy$), takeUntil(this.viewActiveDestroy$))
      .subscribe(() => {
        if (!this.userService.hasMasterAccess()) {
          this.router.navigate(['/home']);
          return;
        }

        this.onUserChange?.();
      });
  }

  ionViewDidLeave(): void {
    this.resetViewSubscriptionScope();
  }

  ngOnDestroy(): void {
    this.resetViewSubscriptionScope();
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onUserChange?(): void;

  private resetViewSubscriptionScope(): void {
    this.viewActiveDestroy$.next();
    this.viewActiveDestroy$.complete();
    this.viewActiveDestroy$ = new Subject<void>();
  }
}
