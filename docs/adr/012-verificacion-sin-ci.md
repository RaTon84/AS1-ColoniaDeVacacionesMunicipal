# ADR-012: Verificación de NFRs con un script en contenedor, sin CI

**Estado:** Aceptada. Reemplaza la propuesta de «tests con pytest y verificación sin CI» del 29/10.
**Fecha:** 12/11/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

La consigna pide verificar los NFRs con evidencia, y la Clase 13 pide para cada NFR un escenario con
medida, cómo se verificó y qué evidencia queda en el repo. Al año siguiente, quien herede el sistema
tiene que poder comprobar antes de abrir la inscripción que el sistema sigue cumpliendo sus reglas. El
grupo votó no tener integración continua (CI). ¿Cómo verificamos los NFRs de forma repetible y dejando
evidencia?

## Drivers de la decisión

- Verificabilidad: cada NFR con una prueba repetible y un resultado guardado.
- NFR-03 Desplegabilidad: no depender de herramientas instaladas en la máquina.
- NFR-04: probar la concurrencia real contra PostgreSQL, no simulada.
- NFR-05: probar con el login real (PKCE), sin abrir permisos especiales en Keycloak.
- Votación del 15/10: sin CI.

## Opciones consideradas

- Script de Python sin dependencias, en un contenedor del compose (perfil `verificacion`)
- CI con GitHub Actions
- k6 para la concurrencia
- Tests de pytest dentro de la app
- Solo pruebas manuales con Swagger UI

## Resultado de la decisión

Opción elegida: «Script en un contenedor del compose», porque prueba el sistema completo, de afuera, sin
instalar nada:

    docker compose --profile verificacion run --rm verificador

`verificacion/verificar.py` inicia sesión con PKCE, llama a la API, lanza pedidos simultáneos al último
cupo y comprueba códigos, tipos de error, estados y tiempos. Incluye una fitness function de arquitectura
(ADR-002) y dos fases más: con el padrón detenido y después de reiniciar los contenedores. Cada corrida
deja su resultado en `verificacion/resultados/` y el resumen va en `docs/VERIFICACION.md`.

### Consecuencias

- Bueno, porque un solo comando dice si el sistema cumple sus NFRs, con evidencia fechada en el repo.
- Bueno, porque el script usa solo la biblioteca estándar de Python y corre en una imagen oficial.
- Malo, porque depende de que alguien lo corra: sin CI, un cambio puede llegar a `main` sin verificar. Se
  mitiga corriéndolo antes de cada entrega y de cada temporada.
- Malo, porque deja datos de prueba en la base: se corre sobre una base de prueba, no sobre la de la
  temporada real.

### Confirmación

Las corridas guardadas en `verificacion/resultados/` y la tabla de `docs/VERIFICACION.md`.

## Pros y contras de las opciones

### Script en un contenedor del compose

- Bueno, porque prueba el sistema real, con el login real, sin instalar nada.
- Neutral, porque no reemplaza a los tests unitarios de las reglas.
- Malo, porque no corre solo en cada cambio.

### CI con GitHub Actions

- Bueno, porque corre solo en cada cambio.
- Malo, porque agrega configuración y depende de GitHub; quedó descartado en la votación.

### k6

- Bueno, porque es la herramienta de la Clase 13 para pruebas de carga, con umbrales.
- Malo, porque no resuelve el login con PKCE ni la verificación de estados, y el escenario no pide volumen
  sino equidad en el último cupo.

### Tests de pytest dentro de la app

- Bueno, porque prueban las reglas rápido y por dentro.
- Malo, porque la concurrencia real y el login necesitan el sistema completo levantado.

### Solo pruebas manuales con Swagger UI

- Bueno, porque sirven para la demo.
- Malo, porque no se repiten igual cada vez ni dejan evidencia.

## Más información

Clase 13 (fitness functions, ingeniería del caos y tests de arquitectura). Revisar si el municipio
consiguiera un servidor de CI: el mismo comando se puede correr desde un pipeline.
