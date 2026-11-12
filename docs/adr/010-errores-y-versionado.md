# ADR-010: Errores con Problem Details y versionado en la URL

**Estado:** Aceptada
**Fecha:** 29/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

La consigna pide una API con semántica HTTP, Problem Details y versionado (Clase 9). Los clientes son la
SPA y, en la demo, Swagger UI. Quien herede el sistema tiene que entender un error sin leer el código, y
el frontend tiene que mostrar un mensaje claro según el tipo de problema. ¿Qué formato tienen los errores
y dónde va la versión de la API?

## Drivers de la decisión

- Interoperabilidad: un formato estándar que cualquier cliente entienda.
- Usabilidad: mensajes claros según el tipo de error.
- NFR-05 Seguridad: no filtrar detalles internos.
- NFR-01 Mantenibilidad: poder cambiar la API sin romper la SPA.

## Opciones consideradas

- Problem Details (RFC 9457) y versión mayor en la ruta
- El formato por defecto de FastAPI (`{"detail": "..."}`)
- Un formato de error propio
- Versión en un encabezado o en el media type
- Sin versionado

## Resultado de la decisión

Opción elegida: «Problem Details y versión en la ruta», porque es el estándar y es lo más visible. Todos los
errores salen como `application/problem+json` con `type`, `title`, `status`, `detail` e `instance`; los
de negocio tienen un `type` propio (`/problemas/edad-fuera-de-rango`, `/problemas/no-residente`,
`/problemas/inscripcion-duplicada`, `/problemas/turno-inexistente`, `/problemas/inscripcion-inexistente`,
`/problemas/padron-no-disponible`, `/problemas/datos-invalidos`) y los genéricos usan `about:blank`. Un
único manejador en `app/core/errors.py` hace la traducción. Los códigos siguen su semántica: 201 con
`Location`, 401 con `WWW-Authenticate: Bearer`, 403, 404 (también si la inscripción es de otro tutor, para
no revelar que existe), 409, 422 y 503 con `Retry-After`. La versión mayor va en la ruta: `/api/v1`.

### Consecuencias

- Bueno, porque los errores son uniformes, están documentados en el contrato (ADR-009) y los entiende una
  persona o un programa.
- Bueno, porque los servicios no dependen de HTTP (ADR-002) y los errores inesperados devuelven 500 sin
  detalles internos.
- Malo, porque el catálogo de tipos de problema hay que actualizarlo en el contrato cuando aparece uno
  nuevo.

### Confirmación

`verificacion/verificar.py` comprueba el `type` de cada error de negocio y que el 401 llegue como
`application/problem+json` con `WWW-Authenticate: Bearer` (NFR-04, NFR-05 y NFR-06).

## Pros y contras de las opciones

### Problem Details y versión en la ruta

- Bueno, porque es estándar, visible y fácil de probar desde el navegador.
- Malo, porque requiere un manejador propio (unas 70 líneas).

### Formato por defecto de FastAPI

- Bueno, porque no requiere código.
- Malo, porque no es estándar, no distingue tipos de error y los errores de validación tienen otra forma.

### Formato propio

- Bueno, porque se adapta a lo que necesitemos.
- Malo, porque cada cliente lo tiene que aprender; RFC 9457 ya lo resuelve.

### Versión en un encabezado o en el media type

- Bueno, porque las URLs no cambian entre versiones.
- Malo, porque es menos visible y más difícil de probar y de explicar a quien herede el sistema.

### Sin versionado

- Bueno, porque es lo más simple hoy.
- Malo, porque cualquier cambio rompe la SPA sin aviso.

## Más información

RFC 9457. Clase 9 (semántica HTTP y versionado).
