# ADR-009: API contract-first con OpenAPI y Swagger UI

**Estado:** Aceptada. Reemplaza la decisión «code-first» de la votación del 15/10.
**Fecha:** 29/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

La consigna pide una API documentada con OpenAPI. En la votación inicial el grupo eligió code-first; en la
Clase 10 la cátedra mostró el enfoque contract-first, con un `openapi.yaml` servido por un contenedor de
Swagger UI. Cuatro integrantes trabajan en paralelo y el frontend necesita saber qué devuelve la API antes
de que el backend esté terminado. ¿Cuál es la fuente de verdad de la interfaz HTTP?

## Drivers de la decisión

- Trabajo en paralelo del equipo (frontend y backend).
- Interoperabilidad: un contrato estándar que documente también los errores.
- NFR-01 Mantenibilidad: que un cambio en la API sea una decisión explícita.

## Opciones consideradas

- Contract-first: `docs/openapi.yaml` escrito a mano y mostrado con Swagger UI
- Code-first: el contrato lo genera FastAPI desde el código
- Contract-first con generación de código
- Documentar la API en el README o en un documento de texto

## Resultado de la decisión

Opción elegida: «Contract-first con Swagger UI», porque el contrato se discute y se revisa antes de
programar. El contrato es `docs/openapi.yaml` y se ve en el contenedor `swagger-ui`
(http://localhost:8082). El backend lo implementa y FastAPI no publica su propio `/docs` ni
`/openapi.json`, para que haya una sola fuente de verdad.

### Consecuencias

- Bueno, porque el frontend se escribe contra el contrato y Swagger UI permite probar la API con login de
  Keycloak (botón *Authorize*).
- Bueno, porque los errores en Problem Details quedan documentados (ADR-010).
- Malo, porque el contrato se mantiene a mano y nada impide automáticamente que el código se aparte. Pasó
  con las operaciones de configuración de la temporada, que se agregaron al contrato después. Un test de
  contrato (por ejemplo, con Schemathesis) queda como mejora.

### Confirmación

Las 16 operaciones que implementa el backend están en `docs/openapi.yaml`, y los códigos que verifica
`docs/VERIFICACION.md` (201, 401, 403, 404, 409, 422, 503) están declarados en el contrato.

## Pros y contras de las opciones

### Contract-first con Swagger UI

- Bueno, porque el contrato existe antes que el código.
- Malo, porque hay que mantener el YAML a mano.

### Code-first

- Bueno, porque es menos trabajo y FastAPI lo hace solo.
- Malo, porque el contrato aparece recién con el código, documenta mal los errores y cambia sin que nadie
  lo decida.

### Contract-first con generación de código

- Bueno, porque el contrato y el código no se pueden separar.
- Malo, porque suma una herramienta al build para una API de 16 operaciones.

### README o documento de texto

- Bueno, porque no requiere herramientas.
- Malo, porque se desactualiza y no se puede probar.

## Más información

Clases 9 y 10. Relacionado con ADR-010.
