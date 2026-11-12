# ADR-003: Base relacional con transacción y bloqueo de fila para el cupo

**Estado:** Aceptada (15/10/2026)

## Contexto

NFR de equidad: el primer día de inscripción muchas familias y administrativos intentan anotarse al
mismo tiempo en el mismo turno. Si dos pedidos leen «queda 1 cupo» a la vez, los dos se confirman y el
turno queda sobreasignado. La asignación tiene que ser por orden de llegada, un chico no puede quedar
inscripto dos veces en la temporada y las inscripciones no se pueden perder.

## Decisión

Vamos a usar **PostgreSQL 16** (con SQLAlchemy y migraciones Alembic que se aplican solas al arrancar) y
procesar cada inscripción en **una transacción que bloquea la fila del turno** (`SELECT … FOR UPDATE`)
mientras cuenta los confirmados y decide si la inscripción queda confirmada o en lista de espera.

Un **índice único parcial** sobre `(dni_chico, temporada)`, que excluye las inscripciones canceladas,
es la última barrera contra duplicados aunque dos pedidos del mismo chico lleguen juntos: si salta, se
responde 409. Un chico con la inscripción cancelada puede volver a inscribirse.

## Alternativas

- **Sin control (contar y después insertar):** simple, pero permite sobreasignar el último cupo.
- **Bloqueo optimista (columna de versión y reintentos):** no bloquea, pero con mucha contención en el
  mismo turno obliga a reintentar y complica el código para un beneficio que esta escala no necesita.
- **Cola de mensajes que serializa las inscripciones:** garantiza el orden, pero suma un broker, un
  proceso consumidor y una respuesta asincrónica. Es sobredimensionar para 1.500 familias.
- **MongoDB (documental):** la unicidad y el cupo quedarían a cargo del código, con transacciones menos
  naturales que en una base relacional.
- **SQLite:** cero instalación, pero bloquea toda la base al escribir; no sirve con varias personas
  inscribiendo a la vez.

## Consecuencias

- Se gana: no se puede sobreasignar un turno; el orden de llegada lo define el orden en que cada pedido
  obtiene el bloqueo; la base garantiza la invariante, sin piezas nuevas.
- Se resigna: los pedidos al mismo turno se atienden de a uno durante unos milisegundos. Con el volumen
  del escenario no se nota, pero la escritura escala solo en vertical: si el pico fuera mucho mayor,
  haría falta una cola delante.
- La consulta al padrón se hace antes de bloquear el turno, para no mantener el bloqueo mientras se
  espera a un sistema externo (ADR-004).
- La misma transacción con bloqueo se usa al cancelar: libera el cupo y promueve al primero de la lista
  de espera.

## NFRs

- Favorece: consistencia, equidad (orden de llegada), integridad de los datos y simplicidad.
- Perjudica levemente: el rendimiento bajo contención extrema en un mismo turno (no esperada).

## Confirmación

`verificacion/verificar.py` deja un turno con un solo cupo libre y lanza 30 pedidos simultáneos
(familias y administrativos a la vez): tiene que quedar 1 confirmada, 29 en lista de espera con posiciones
consecutivas y 0 cupos libres. También lanza 10 pedidos simultáneos del mismo chico (1 × 201 y 9 × 409) y
prueba cancelar con promoción y reinscripción. Resultado en `docs/VERIFICACION.md` (NFR-04).
