import { Directive, OnDestroy } from '@angular/core';
import { ViewDidLeave, ViewWillEnter } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../services/user.service';

@Directive()
export abstract class PublicPageTemplate implements ViewWillEnter, ViewDidLeave, OnDestroy {
  protected userService: UserService;
  private destroy$ = new Subject<void>();
  private viewActiveDestroy$ = new Subject<void>();

  constructor(userService: UserService) {
    this.userService = userService;
  }

  ionViewWillEnter(): void {
    this.resetViewSubscriptionScope();

    this.userService.activeUid$
      .pipe(takeUntil(this.destroy$), takeUntil(this.viewActiveDestroy$))
      .subscribe(() => {
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
