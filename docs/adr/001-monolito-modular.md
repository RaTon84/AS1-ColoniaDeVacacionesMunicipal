# ADR-001: Monolito modular

**Estado:** Aceptada (15/10/2026)

## Contexto

El escenario 6A es una colonia de vacaciones de un municipio chico: 600 cupos, unas 1.500 familias y la
inscripción abierta 3 semanas por año. Lo mantiene un área de sistemas de una sola persona y corre en un
servidor municipal compartido con otros sistemas. El NFR estrella es mantenibilidad y costo, y la
restricción es que al año siguiente se tiene que poder volver a levantar sin que nadie se acuerde de cómo.

Hay que decidir cómo se empaquetan y despliegan los componentes: inscripciones, turnos, administración e
integración con el padrón.

## Decisión

Vamos a construir un **monolito modular**: una sola aplicación FastAPI desplegable, con módulos separados
por responsabilidad (`turnos`, `inscripciones`, `administracion`) y una única base PostgreSQL.

## Alternativas

- **Monolito por capas:** igual de simple de desplegar, pero las capas horizontales mezclan las
  responsabilidades de todos los módulos y cuesta mantener límites claros.
- **Microservicios:** despliegue y escalado independientes que esta escala no necesita; multiplica
  contenedores, bases y complejidad operativa para una sola persona. Sería sobredimensionar.
- **Orientado a eventos:** suma un broker y un flujo difícil de depurar y de transaccionar, sin beneficio
  con este volumen de inscripciones.

La comparación con criterios está en la Matriz de Pugh de `docs/ARQUITECTURA.md`.

## Consecuencias

- Se gana: un solo desplegable que levanta con un comando, bajo consumo en el servidor compartido, un
  sistema fácil de entender para quien lo herede y transacciones locales para el cupo (ADR-003).
- Si algún día la escala cambiara, un módulo con límites claros se puede separar como servicio.
- Se resigna: escalar o desplegar partes por separado (no hace falta con esta carga) y aislar fallas
  entre módulos: si la app se cae, se cae todo. Hay que sostener la disciplina de no cruzar los límites
  entre módulos (ADR-002).

## NFRs

- Favorece: mantenibilidad, costo, simplicidad de operación y consistencia de datos.
- Perjudica: escalabilidad independiente y aislamiento de fallas (aceptable para el escenario).

## Confirmación

El compose tiene un único servicio de aplicación (`app`) y el C4 de Contenedores de
`docs/ARQUITECTURA.md` coincide con él.
