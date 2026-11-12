# ADR-005: Keycloak como proveedor de identidad (OIDC, Authorization Code + PKCE)

**Estado:** Aceptada (22/10/2026)

## Contexto

La consigna pide login con OIDC y al menos dos roles. Los usuarios son tutores (familias) y
administrativos del municipio. El sistema no debe guardar contraseñas propias: lo mantiene una sola
persona y un error de seguridad en un login casero sería caro. La aplicación es una SPA servida por el
mismo backend: el navegador no puede guardar un secreto de cliente.

## Decisión

Vamos a usar **Keycloak 26** como proveedor de identidad, con un realm `colonia` versionado en el repo
(`keycloak/realm-colonia.json`) que se importa solo al arrancar. La SPA es un cliente público que hace
el flujo **Authorization Code con PKCE (S256)**. El backend valida cada token: la firma con las claves
públicas (JWKS) de Keycloak, el emisor (`iss`), la audiencia (`aud`) y el vencimiento (`exp`), y
autoriza por los roles del realm (`tutor`, `administrativo`, `administrador_sistema`).

## Alternativas

- **Login propio (usuarios y contraseñas en nuestra base):** más código y más riesgo; no cumple OIDC.
- **Proveedor en la nube (Auth0, Google, Entra ID):** sin servidor que operar, pero depende de una
  cuenta externa y de Internet, y al año siguiente puede haber cambiado la cuenta o el plan. Choca con
  la restricción de «volver a levantar sin acordarse».
- **Otros proveedores autoalojados (Authentik, Zitadel):** comparables, pero Keycloak es el que usa la
  cátedra (Clase 11) y tiene la consola y la documentación más conocidas.
- **Flujo Implicit:** desaconsejado por OAuth 2.1; el token viaja en la URL. PKCE lo reemplaza para SPAs.

## Consecuencias

- Se gana: la aplicación no maneja contraseñas; los roles y usuarios se administran desde la consola de
  Keycloak; el realm versionado hace que el login se reconstruya igual cada vez.
- Se resigna: un contenedor más, el más pesado del sistema (cerca de 500 MB de RAM), y un tiempo de
  arranque de unos 20 segundos.
- En modo `start-dev` Keycloak guarda sus datos dentro del contenedor: los usuarios creados a mano desde
  la consola se pierden al recrearlo. Para el uso real hay que agregar un volumen o usar la base
  PostgreSQL, y pasar a `start` con HTTPS.
- Hoy los usuarios de prueba vienen en el realm y el autorregistro está deshabilitado. Para las 1.500
  familias habría que habilitar el registro con verificación de correo, que Keycloak trae incorporado.

## NFRs

- Favorece: seguridad, mantenibilidad (no hay login propio que mantener) e interoperabilidad (estándar).
- Perjudica: consumo de recursos y tiempo de arranque.

## Confirmación

`verificacion/verificar.py` inicia sesión con los tres usuarios de prueba por Authorization Code +
PKCE, igual que la SPA, y comprueba: sin token → 401 con `WWW-Authenticate: Bearer`, token con la firma
alterada → 401, tutor en el listado administrativo → 403 y tutor que pide una inscripción ajena → 404.
Resultado en `docs/VERIFICACION.md` (NFR-05).
