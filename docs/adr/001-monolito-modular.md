# ADR-001: Monolito modular como estilo arquitectónico

**Estado:** Aceptada
**Fecha:** 15/10/2026 · **Decisores:** grupo Los Betos (votación del 15/10)

## Contexto y problema

El escenario 6A es una colonia de vacaciones de un municipio chico: 600 cupos, unas 1.500 familias y la
inscripción abierta 3 semanas por año. Lo mantiene un área de sistemas de una sola persona y corre en un
servidor municipal compartido con otros sistemas. ¿Cómo empaquetamos y desplegamos los componentes
(inscripciones, turnos, administración e integración con el padrón)?

## Drivers de la decisión

- NFR-01 Mantenibilidad (estrella): una sola persona tiene que entender y cambiar el sistema.
- NFR-02 Costo: el servidor es compartido y no hay presupuesto para infraestructura nueva.
- NFR-03 Desplegabilidad: al año siguiente se tiene que volver a levantar sin acordarse de cómo.
- NFR-04 Integridad: el cupo y la inscripción única necesitan transacciones confiables.

## Opciones consideradas

- Monolito por capas (baseline de la Matriz de Pugh)
- Monolito modular
- Microservicios
- Arquitectura orientada a eventos

## Resultado de la decisión

Opción elegida: «Monolito modular», porque es la que mejor puntúa en la Matriz de Pugh (+4) y da límites
claros entre módulos sin sumar la operación de un sistema distribuido. Es una sola aplicación FastAPI
desplegable, con los módulos `turnos`, `inscripciones` y `administracion` y una única base PostgreSQL.

### Consecuencias

- Bueno, porque hay un solo desplegable que levanta con un comando y consume poco en el servidor
  compartido.
- Bueno, porque las transacciones son locales, lo que permite resolver el cupo con la base (ADR-003).
- Bueno, porque si la escala cambiara, un módulo con límites claros se puede separar como servicio.
- Malo, porque no se pueden escalar ni desplegar partes por separado, y una falla de la app afecta a
  todo el sistema.
- Malo, porque hay que sostener la disciplina de no cruzar los límites entre módulos (ADR-002).

### Confirmación

El compose tiene un único servicio de aplicación (`app`) y el C4 de Contenedores de
`docs/ARQUITECTURA.md` coincide con él.

## Pros y contras de las opciones

### Monolito por capas

- Bueno, porque es igual de simple de desplegar.
- Malo, porque las capas horizontales mezclan las responsabilidades de todos los módulos y cuesta
  mantener límites claros a medida que crece.

### Monolito modular

- Bueno, porque combina un despliegue simple con módulos separados por responsabilidad.
- Neutral, porque los límites entre módulos dependen de la disciplina del equipo.
- Malo, porque no aísla fallas entre módulos.

### Microservicios

- Bueno, porque permite escalar y desplegar cada servicio por separado y aísla fallas.
- Malo, porque multiplica contenedores, bases y complejidad operativa para una sola persona.
- Malo, porque el cupo pasaría a necesitar consistencia entre servicios. Sería sobredimensionar.

### Orientada a eventos

- Bueno, porque desacopla los componentes y tolera mejor las caídas.
- Malo, porque suma un broker y un flujo asincrónico difícil de depurar y de transaccionar, sin beneficio
  con este volumen.

## Más información

Matriz de Pugh en `docs/ARQUITECTURA.md` (sección 6). Revisar si la colonia pasara a varias sedes con
miles de familias o si otro sistema municipal necesitara reutilizar un módulo.
