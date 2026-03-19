# webapp-ligaventureros

Aplicacion web/movil de **Liga de Aventureros de Vigo** construida con **Ionic 8 + Angular 20 (standalone)** y preparada para integracion con Capacitor.

## Stack

- Angular 20 (standalone components)
- Ionic Framework 8
- Capacitor 8
- TypeScript 5
- RxJS 7
- ESLint + Karma/Jasmine

## Requisitos

- Node.js 20+
- npm 10+
- Ionic CLI (opcional, pero recomendado):

```bash
npm install -g @ionic/cli
```

## Instalacion

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm start
```

El proyecto corre por defecto con configuracion de desarrollo (`ng serve`).

Alternativamente, con Ionic CLI instalado:

```bash
ionic serve
```

## Scripts disponibles

- `npm start`: levanta servidor de desarrollo.
- `npm run build`: genera build de produccion en `www/`.
- `npm run watch`: build en modo watch para desarrollo.
- `npm run test`: ejecuta tests con Karma/Jasmine.
- `npm run lint`: ejecuta lint con Angular ESLint.

## Build para produccion

```bash
npm run build
```

Salida generada en:

- `www/`

## Configuracion de entorno

Archivos:

- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (produccion)

Variables principales:

- `appName`: nombre mostrado en la app.
- `version`: version de la app.
- `api`: base URL del backend.
- `kofi`: URL de Ko-fi.

## Arquitectura resumida

Paginas:

- `src/app/pages/tabs/`: layout principal con tab bar.
- `src/app/pages/home/`: pagina de inicio.

Componentes:

- `src/app/components/app-menu/`: menu lateral (tema, cuentas, Ko-fi).
- `src/app/components/login-modal/`: modal de inicio de sesion.
- `src/app/components/kofi-support-card/`: banner de Ko-fi.

Servicios:

- `src/app/services/api.service.ts`: cliente HTTP generico para backend.
- `src/app/services/user.service.ts`: estado de usuarios/sesion en `localStorage`.
- `src/app/services/theme.service.ts`: modo de tema (`system`, `light`, `dark`).

## Estructura del proyecto

```text
src/
  app/
    components/
      app-menu/
      kofi-support-card/
      login-modal/
    pages/
      home/
      tabs/
    services/
      api.service.ts
      theme.service.ts
      user.service.ts
  environments/
  assets/
```

## Licencia

Este software es **codigo abierto** y se distribuye bajo la licencia **GNU General Public License v3.0 (GPL-3.0)**.

Puedes usar, estudiar, modificar y redistribuir el codigo siempre que mantengas las condiciones de la GPL.

Para el texto completo de la licencia y avisos de terceros, consulta:

- `LICENSE`
- `ThirdPartyNotices`
