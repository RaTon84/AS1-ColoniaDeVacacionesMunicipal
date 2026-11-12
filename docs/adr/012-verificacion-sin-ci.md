# ADR-012: Verificación de NFRs con un script en contenedor, sin CI

**Estado:** Aceptada (12/11/2026). Reemplaza la propuesta de «tests con pytest y verificación sin CI» del 29/10.

## Contexto

La consigna pide verificar los NFRs con evidencia. Al año siguiente, quien herede el sistema tiene que
poder comprobar, antes de abrir la inscripción, que el sistema sigue cumpliendo sus reglas. El grupo votó
no tener integración continua (CI): no hay un servidor para eso y sería sobredimensionar. La restricción
del escenario pide además no depender de herramientas instaladas en la máquina.

## Decisión

Vamos a verificar los NFRs con **un script de Python sin dependencias** (`verificacion/verificar.py`) que
corre **en un contenedor del mismo compose**, en el perfil `verificacion`:

    docker compose --profile verificacion run --rm verificador

Prueba el sistema de afuera, como un cliente más: inicia sesión con PKCE, llama a la API, lanza pedidos
simultáneos al último cupo y comprueba códigos, tipos de error, estados y tiempos. Tiene también una
fitness function de arquitectura (ADR-002) y dos fases para después de detener el padrón y de reiniciar
los contenedores. Cada corrida deja un archivo con el resultado en `verificacion/resultados/`, y el
resumen va en `docs/VERIFICACION.md`.

## Alternativas

- **CI con GitHub Actions:** corre solo en cada cambio, pero agrega configuración y depende de GitHub;
  quedó descartado en la votación.
- **k6 para la concurrencia:** es la herramienta de la Clase 13 para carga, pero no resuelve el login con
  PKCE ni la verificación de estados; el escenario no pide volumen sino equidad en el último cupo.
- **Tests de pytest dentro de la app:** prueban las reglas por dentro, pero la concurrencia real y el
  login necesitan el sistema completo levantado.
- **Solo pruebas manuales con Swagger UI:** sirven para la demo, pero no se repiten igual cada vez ni
  dejan evidencia.

## Consecuencias

- Se gana: un comando para saber si el sistema cumple sus NFRs, sin instalar nada y con evidencia
  fechada en el repo.
- Se resigna: depende de que alguien lo corra (sin CI, un cambio puede llegar a `main` sin verificar); se
  mitiga corriéndolo antes de cada entrega y de cada temporada. El script deja datos de prueba en la base:
  se corre sobre una base de prueba, no sobre la de la temporada real.

## NFRs

- Favorece: verificabilidad, mantenibilidad y confiabilidad.
- Perjudica levemente: el costo de desarrollo.

## Confirmación

Las corridas guardadas en `verificacion/resultados/` y la tabla de `docs/VERIFICACION.md`.
