import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class MasterGuard implements CanActivate {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.userService.hasMasterAccess()) {
      return true;
    }

    // Redirigir a home si no es master
    this.router.navigate(['/home']);
    return false;
  }
}
