# ADR-009: API contract-first con OpenAPI y Swagger UI

**Estado:** Aceptada (29/10/2026). Reemplaza la decisión «code-first» de la votación del 15/10.

## Contexto

La consigna pide una API documentada con OpenAPI. En la votación inicial el grupo eligió code-first:
dejar que FastAPI genere el contrato a partir del código. En la Clase 10 la cátedra mostró el enfoque
contract-first, con un `openapi.yaml` servido por un contenedor de Swagger UI. Cuatro integrantes trabajan
en paralelo: el frontend necesita saber qué devuelve la API antes de que el backend esté terminado.

## Decisión

Vamos a escribir el contrato **primero** en `docs/openapi.yaml` y a mostrarlo con el contenedor
**swagger-ui** (http://localhost:8082). El backend implementa ese contrato. FastAPI no publica su propio
`/docs` ni `/openapi.json`, para que haya una sola fuente de verdad.

## Alternativas

- **Code-first (la votación inicial):** menos trabajo, y FastAPI lo hace solo; pero el contrato aparece
  recién cuando el código existe, no documenta bien los errores (Problem Details) y cualquier cambio en
  el código cambia el contrato sin que nadie lo decida.
- **Contract-first con generación de código:** el contrato es la fuente y se generan los modelos;
  agrega una herramienta más al ciclo de build para una API de 16 operaciones.
- **Documentar la API en el README o en un documento de texto:** se desactualiza y no se puede probar.

## Consecuencias

- Se gana: el contrato se discute y se revisa en el PR antes de programar; el frontend se escribe contra
  él; Swagger UI permite probar la API con login de Keycloak (botón *Authorize*).
- Se resigna: hay que mantener el contrato a mano, y nada impide automáticamente que el código se aparte
  de él. Pasó con las operaciones de configuración de la temporada, que se agregaron al contrato después.
  Un test de contrato (por ejemplo, con Schemathesis) quedaría como mejora.
- La API permite llamadas desde el origen de Swagger UI (CORS limitado a `http://localhost:8082`).

## NFRs

- Favorece: mantenibilidad, interoperabilidad y trabajo en paralelo del equipo.
- Perjudica levemente: el costo de desarrollo (escribir y mantener el YAML).

## Confirmación

Las 16 operaciones que implementa el backend están en `docs/openapi.yaml`, y los códigos que verifica
`docs/VERIFICACION.md` (201, 401, 403, 404, 409, 422, 503) están declarados en el contrato.
