# webapp-ligaventureros

Aplicacion web/movil de la Liga de Aventureros de Vigo construida con Ionic + Angular (standalone), con soporte de cuentas multiples, roles y rutas protegidas.

## Stack

- Angular 20 (standalone)
- Ionic Framework 8
- Capacitor 8
- TypeScript 5
- RxJS 7
- ESLint + Karma/Jasmine

## Requisitos

- Node.js 20+
- npm 10+
- Ionic CLI (opcional)

```bash
npm install -g @ionic/cli
```

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm start
```

Alternativa con Ionic CLI:

```bash
ionic serve
```

## Scripts

- `npm start`: servidor de desarrollo.
- `npm run build`: build de produccion.
- `npm run watch`: build en modo watch.
- `npm run test`: tests con Karma/Jasmine.
- `npm run lint`: lint con Angular ESLint.

## Build

```bash
npm run build
```

Salida en `www/`.

## Configuracion de entorno

Archivos:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Variables principales:

- `appName`
- `version`
- `api`
- `kofi`

## Autenticacion y roles

### Estado de usuario

- `UserService` mantiene una lista de usuarios y un usuario activo.
- El estado persistido se guarda en `users_state`.
- `activeUid$` emite cambios del usuario activo.

### Cliente API

- `ApiService` inyecta automaticamente el JWT del usuario activo en llamadas al backend interno (`/v1`) cuando no se pasa `Authorization` manual.
- Si se especifica `Authorization` en la llamada, se respeta ese valor.

### Guards por rol

- `AdminGuard`: acceso admin.
- `MasterGuard`: acceso master (o admin, segun logica de `hasMasterAccess`).

## Templates base de pagina

Para evitar repetir logica de suscripcion/redireccion por cambios de usuario, hay templates reutilizables:

- `AdminPageTemplate`
- `MasterPageTemplate`
- `PublicPageTemplate`

Estas clases usan ciclo de vida de Ionic (`ionViewWillEnter` / `ionViewDidLeave`) para que la reaccion a `onUserChange` ocurra solo cuando la vista esta activa.

Ejemplo de uso:

```ts
@Component({
  standalone: true,
  templateUrl: './example.page.html',
})
export class ExamplePage extends PublicPageTemplate {
  constructor(userService: UserService) {
    super(userService);
  }

  protected override onUserChange?(): void {
    // logica al cambiar el usuario activo
  }
}
```

## Rutas actuales

- `/tabs/home`: pagina publica principal.
- `/tabs/admin`: pagina protegida por `AdminGuard`.
- `/tabs/master`: pagina protegida por `MasterGuard`.

## Estructura relevante

```text
src/
  app/
    components/
      app-menu/
      kofi-support-card/
      login-modal/
    guards/
      admin.guard.ts
      master.guard.ts
    pages/
      admin/
      home/
      master/
      tabs/
    services/
      api.service.ts
      storage.service.ts
      theme.service.ts
      user.service.ts
    templates/
      admin-page.template.ts
      master-page.template.ts
      public-page.template.ts
  environments/
  assets/
```

## Licencia

Este software se distribuye bajo licencia GNU GPL v3.0.

Consulta:

- `LICENSE`
- `ThirdPartyNotices`
