# ADR-005: Keycloak como proveedor de identidad (OIDC, Authorization Code + PKCE)

**Estado:** Aceptada
**Fecha:** 22/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

La consigna pide login con OIDC y al menos dos roles. Los usuarios son tutores y personal del municipio.
La aplicación es una SPA servida por el mismo backend (ADR-011): el navegador no puede guardar un secreto
de cliente. ¿Quién autentica a los usuarios, con qué flujo, y dónde y qué se valida del token?

## Drivers de la decisión

- NFR-05 Seguridad: el sistema no debe guardar contraseñas propias, y los permisos se controlan en la API.
- NFR-03 Desplegabilidad: el login se tiene que reconstruir igual al año siguiente.
- Consigna: OIDC con al menos dos roles.
- La SPA es un cliente público (no puede guardar secretos).

## Opciones consideradas

- Keycloak autoalojado, Authorization Code + PKCE
- Login propio (usuarios y contraseñas en nuestra base)
- Proveedor en la nube (Auth0, Google, Entra ID)
- Otro proveedor autoalojado (Authentik, Zitadel)
- Flujo Implicit

## Resultado de la decisión

Opción elegida: «Keycloak con Authorization Code + PKCE», porque cumple OIDC sin depender de una cuenta
externa y se reconstruye solo. Keycloak 26 corre en el compose con el realm `colonia` versionado en el repo
(`keycloak/realm-colonia.json`), que se importa al arrancar. La SPA es un cliente público que hace el flujo
**Authorization Code con PKCE (S256)**. El backend valida cada token: la firma con las claves públicas
(JWKS) de Keycloak, el emisor (`iss`), la audiencia (`aud`) y el vencimiento (`exp`), y autoriza por los
roles del realm (ADR-008).

### Consecuencias

- Bueno, porque la aplicación no maneja contraseñas y los usuarios se administran desde la consola de
  Keycloak.
- Bueno, porque el realm versionado hace que el login se reconstruya igual cada vez.
- Bueno, porque MFA o el autorregistro con verificación de correo se activan en Keycloak sin tocar la
  aplicación.
- Malo, porque es el contenedor más pesado (cerca de 500 MB de RAM) y tarda unos 20 segundos en arrancar.
- Malo, porque en modo `start-dev` guarda sus datos dentro del contenedor: los usuarios creados a mano se
  pierden al recrearlo. Para el uso real hay que darle un volumen o la base PostgreSQL y pasar a `start`
  con HTTPS.

### Confirmación

`verificacion/verificar.py` inicia sesión con los tres usuarios de prueba por Authorization Code +
PKCE, igual que la SPA, y comprueba: sin token → 401 con `WWW-Authenticate: Bearer`, token con la firma
alterada → 401, tutor en el listado administrativo → 403 y tutor que pide una inscripción ajena → 404.
Resultado en `docs/VERIFICACION.md` (NFR-05).

## Pros y contras de las opciones

### Keycloak con PKCE

- Bueno, porque es estándar, autoalojado y versionable.
- Neutral, porque es el que usa la cátedra (Clase 11), con documentación conocida.
- Malo, porque consume recursos y tiempo de arranque.

### Login propio

- Bueno, porque no suma contenedores.
- Malo, porque es más código y más riesgo (guardar contraseñas), y no cumple OIDC.

### Proveedor en la nube

- Bueno, porque no hay servidor que operar.
- Malo, porque depende de una cuenta externa y de Internet, y al año siguiente puede haber cambiado la
  cuenta o el plan. Choca con la restricción del escenario.

### Otro proveedor autoalojado

- Bueno, porque es comparable y algunos son más livianos.
- Malo, porque el grupo no lo conoce y tiene menos material de la cursada.

### Flujo Implicit

- Bueno, porque es simple para una SPA.
- Malo, porque está desaconsejado por OAuth 2.1: el token viaja en la URL. PKCE lo reemplaza.

## Más información

Clase 11 (OAuth 2.0, OIDC y PKCE). Relacionado con ADR-008 (roles) y ADR-011 (SPA sin BFF).
