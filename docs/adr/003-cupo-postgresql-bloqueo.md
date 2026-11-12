# ADR-003: Base relacional con transacción y bloqueo de fila para el cupo

**Estado:** Aceptada
**Fecha:** 15/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

El primer día de inscripción muchas familias y administrativos intentan anotarse al mismo tiempo en el
mismo turno. Si dos pedidos leen «queda 1 cupo» a la vez, los dos se confirman y el turno queda
sobreasignado. ¿Con qué base y con qué mecanismo garantizamos que nunca se asignen más cupos de los que
hay, que se respete el orden de llegada y que un chico no quede inscripto dos veces?

## Drivers de la decisión

- NFR-04 Integridad y equidad: 0 cupos sobreasignados y 0 duplicados, aun con pedidos simultáneos.
- NFR-03 Desplegabilidad: el esquema se tiene que crear solo al año siguiente.
- NFR-02 Costo y NFR-01 Mantenibilidad: sin piezas nuevas que operar.

## Opciones consideradas

- PostgreSQL con transacción y bloqueo pesimista de la fila del turno
- PostgreSQL contando y después insertando, sin control
- PostgreSQL con bloqueo optimista (columna de versión y reintentos)
- Cola de mensajes que serializa las inscripciones
- MongoDB
- SQLite

## Resultado de la decisión

Opción elegida: «PostgreSQL con transacción y bloqueo pesimista», porque la base garantiza la invariante
sin piezas nuevas. Cada inscripción bloquea la fila del turno (`SELECT … FOR UPDATE`), cuenta las
confirmadas y decide si queda confirmada o en lista de espera. Un **índice único parcial** sobre
(`dni_chico`, `temporada`), que excluye las canceladas, es la última barrera contra duplicados: si salta,
se responde 409. Se accede con SQLAlchemy y el esquema se versiona con Alembic, que migra solo al arrancar.

### Consecuencias

- Bueno, porque no se puede sobreasignar un turno y el orden de llegada es el orden en que cada pedido
  obtiene el bloqueo.
- Bueno, porque la misma transacción con bloqueo se usa al cancelar (promueve a la primera en espera) y
  al cambiar el cupo.
- Bueno, porque la consulta al padrón se hace antes de bloquear el turno, así que el bloqueo no se retiene
  mientras se espera a un sistema externo (ADR-004).
- Malo, porque los pedidos al mismo turno se atienden de a uno durante unos milisegundos.
- Malo, porque la escritura escala solo en vertical: si el pico fuera mucho mayor, haría falta una cola
  delante.

### Confirmación

`verificacion/verificar.py` deja un turno con un solo cupo libre y lanza 30 pedidos simultáneos
(familias y administrativos a la vez): tiene que quedar 1 confirmada, 29 en lista de espera con posiciones
consecutivas y 0 cupos libres. También lanza 10 pedidos simultáneos del mismo chico (1 × 201 y 9 × 409) y
prueba cancelar con promoción y reinscripción. Resultado en `docs/VERIFICACION.md` (NFR-04).

## Pros y contras de las opciones

### PostgreSQL con bloqueo pesimista

- Bueno, porque la invariante la garantiza la base y el código es fácil de leer.
- Neutral, porque toda escritura sobre un turno tiene que usar el mismo bloqueo.
- Malo, porque serializa los pedidos al mismo turno.

### Contar y después insertar, sin control

- Bueno, porque es lo más simple.
- Malo, porque permite sobreasignar el último cupo.

### Bloqueo optimista

- Bueno, porque no bloquea.
- Malo, porque con mucha contención en el mismo turno obliga a reintentar y complica el código para un
  beneficio que esta escala no necesita.

### Cola de mensajes

- Bueno, porque garantiza el orden y absorbe picos grandes.
- Malo, porque suma un broker, un consumidor y una respuesta asincrónica. Es sobredimensionar para 1.500
  familias.

### MongoDB

- Bueno, porque el esquema es flexible.
- Malo, porque la unicidad y el cupo quedarían a cargo del código, con transacciones menos naturales.

### SQLite

- Bueno, porque no requiere instalación.
- Malo, porque bloquea toda la base al escribir y no sirve con varias personas inscribiendo a la vez.

## Más información

Relacionado con ADR-004 (padrón). Revisar si el pico real superara lo medido
en la verificación.
