# ADR-010: Errores con Problem Details y versionado en la URL

**Estado:** Aceptada (29/10/2026)

## Contexto

La consigna pide una API con semántica HTTP, Problem Details y versionado (Clase 9). Los clientes de la
API son la SPA y, en la demo, Swagger UI. Quien herede el sistema tiene que poder entender un error sin
leer el código, y el frontend tiene que poder mostrar un mensaje claro según el tipo de problema.

## Decisión

Vamos a:

- Responder **todos los errores con Problem Details (RFC 9457)**, `Content-Type: application/problem+json`
  y los campos `type`, `title`, `status`, `detail` e `instance`. Los errores de negocio tienen un `type`
  propio (`/problemas/edad-fuera-de-rango`, `/problemas/no-residente`, `/problemas/inscripcion-duplicada`,
  `/problemas/turno-inexistente`, `/problemas/inscripcion-inexistente`, `/problemas/padron-no-disponible`,
  `/problemas/datos-invalidos`); los errores HTTP genéricos usan `about:blank`. Un único manejador en
  `app/core/errors.py` hace la traducción.
- Usar los códigos según su semántica: 201 con encabezado `Location` al crear, 401 sin token o con token
  inválido (con `WWW-Authenticate: Bearer`), 403 sin el rol, 404 turno o inscripción inexistente (también
  si la inscripción es de otro tutor, para no revelar que existe), 409 duplicado, 422 datos o reglas
  inválidas y 503 con `Retry-After` cuando el padrón no responde.
- Poner la **versión mayor en la ruta** (`/api/v1`). Un cambio incompatible abriría `/api/v2`, y las dos
  versiones convivirían mientras se migra la SPA.

## Alternativas

- **El formato por defecto de FastAPI (`{"detail": "..."}`):** sin código propio, pero no es un
  estándar, no distingue tipos de error y los errores de validación tienen otra forma.
- **Formato de error propio:** igual de útil, pero cada cliente lo tiene que aprender; RFC 9457 ya lo
  resuelve.
- **Versión en un encabezado o en el media type:** más «puro», pero menos visible, más difícil de probar
  desde el navegador y de explicar a quien herede el sistema.
- **Sin versionado:** simple hoy, pero cualquier cambio rompe la SPA sin aviso.

## Consecuencias

- Se gana: errores uniformes, documentados en el contrato (ADR-009) y legibles por humanos y por código;
  los servicios no dependen de HTTP (ADR-002).
- Se resigna: el catálogo de tipos de problema hay que actualizarlo en el contrato cuando aparece uno
  nuevo.
- Los errores inesperados devuelven 500 en el mismo formato, sin mostrar detalles internos al cliente.

## NFRs

- Favorece: interoperabilidad, mantenibilidad, usabilidad (mensajes claros) y seguridad (no se filtran
  detalles internos).
- Perjudica: nada relevante; el costo es un manejador de unas 70 líneas.

## Confirmación

`verificacion/verificar.py` comprueba el `type` de cada error de negocio y que el 401 llegue como
`application/problem+json` con `WWW-Authenticate: Bearer` (NFR-04, NFR-05 y NFR-06).
