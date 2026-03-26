import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { MasterGuard } from './guards/master.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      // Rutas públicas
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
      },
      // Rutas protegidas para master
      {
        path: 'master',
        loadComponent: () => import('./pages/master/master-control-panel/master-control-panel.page').then((m) => m.MasterControlPanelPage),
        canActivate: [MasterGuard],
      },
      // Rutas protegidas para admin
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin-control-panel/admin-control-panel.page').then((m) => m.AdminControlPanelPage),
        canActivate: [AdminGuard],
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./pages/admin/manage-users/manage-users.page').then((m) => m.ManageUsersPage),
        canActivate: [AdminGuard],
      },
      // Redirecciones
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
];
