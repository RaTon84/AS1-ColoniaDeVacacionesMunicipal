# ADR-007: Lista de espera por turno, con cancelación y promoción

**Estado:** Aceptada
**Fecha:** 29/10/2026 · **Decisores:** grupo Los Betos (en la votación quedó empatada; se decidió el 29/10)

## Contexto y problema

Hay 600 cupos para unas 1.500 familias: la mayoría de los pedidos llega con el turno ya lleno. ¿Qué hacemos
con esos pedidos, y qué pasa con el lugar cuando alguien se da de baja?

## Drivers de la decisión

- NFR-04 Equidad: la asignación es por orden de llegada, también para los que no entraron.
- Usabilidad para la oficina: cubrir las bajas sin discutir a quién le toca.
- NFR-01 Mantenibilidad y NFR-02 Costo: no sobredimensionar.

## Opciones consideradas

- Lista de espera por turno, con promoción automática
- Rechazar cuando no hay cupo (409)
- Sorteo al cierre de la inscripción
- Lista de espera única para toda la colonia

## Resultado de la decisión

Opción elegida: «Lista de espera por turno, con promoción automática», porque registra el orden de
llegada con un costo mínimo. Los pedidos que llegan con el turno lleno quedan en `LISTA_ESPERA` con su
posición, decidida en la misma transacción con bloqueo que el cupo (ADR-003). Al **cancelar** una
inscripción confirmada se promueve a la primera de la lista de ese turno y se renumeran las demás; si el
administrador del sistema **amplía el cupo** de un turno, se promueve en orden a tantas como cupos nuevos
haya. Un chico con la inscripción cancelada puede volver a inscribirse.

### Consecuencias

- Bueno, porque el orden de llegada queda registrado y la oficina cubre las bajas sin discusiones.
- Bueno, porque el costo es un estado más y una columna (`posicion_espera`), sin tablas ni procesos nuevos.
- Malo, porque la promoción no avisa a la familia: se entera al consultar sus inscripciones. Un aviso por
  correo quedaría para una próxima versión.
- Malo, porque el modelo suma un estado y su renumeración.

### Confirmación

`verificacion/verificar.py`: los pedidos que llegan con el turno lleno quedan con posiciones consecutivas,
y al cancelar la confirmada la primera de la lista pasa a confirmada (NFR-04).

## Pros y contras de las opciones

### Lista de espera por turno, con promoción

- Bueno, porque respeta el orden de llegada de punta a punta.
- Malo, porque agrega un estado y la lógica de promoción.

### Rechazar cuando no hay cupo

- Bueno, porque es lo más simple.
- Malo, porque si alguien se da de baja el municipio no sabe a quién le corresponde el lugar, y las
  familias tienen que reintentar sin saber cuándo.

### Sorteo al cierre

- Bueno, porque también es justo.
- Malo, porque el escenario pide orden de llegada y agrega un proceso al final de las 3 semanas.

### Lista única para toda la colonia

- Bueno, porque guarda menos datos.
- Malo, porque las familias eligen turno por horario y sede.

## Más información

Relacionado con ADR-003. La cancelación y la reinscripción se agregaron el 01/11 (PR #8) sin cambiar
esta decisión.
