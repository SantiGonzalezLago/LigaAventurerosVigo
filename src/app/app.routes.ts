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
      {
        path: 'profile',
        loadComponent: () => import('./pages/users/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'profile/:uid',
        loadComponent: () => import('./pages/users/profile/profile.page').then((m) => m.ProfilePage),
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
      {
        path: 'admin/server-settings',
        loadComponent: () => import('./pages/admin/server-settings/server-settings.page').then((m) => m.ServerSettingsPage),
        canActivate: [AdminGuard],
      },
      {
        path: 'admin/upload-files-log',
        loadComponent: () => import('./pages/admin/upload-files-log/upload-files-log.page').then((m) => m.UploadFilesLogPage),
        canActivate: [AdminGuard],
      },
      {
        path: 'admin/game-systems',
        loadComponent: () => import('./pages/admin/manage-game-systems/manage-game-systems.page').then((m) => m.ManageGameSystemsPage),
        canActivate: [AdminGuard],
      },
      {
        path: 'admin/game-types',
        loadComponent: () => import('./pages/admin/manage-game-types/manage-game-types.page').then((m) => m.ManageGameTypesPage),
        canActivate: [AdminGuard],
      },
      {
        path: 'admin/game-systems/:slug',
        loadComponent: () => import('./pages/admin/manage-game-systems/manage-game-system/manage-game-system.page').then((m) => m.ManageGameSystemPage),
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
