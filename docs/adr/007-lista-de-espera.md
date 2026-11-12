# ADR-007: Lista de espera por turno, con cancelación y promoción

**Estado:** Aceptada (29/10/2026)

## Contexto

Hay 600 cupos para unas 1.500 familias: la mayoría de los pedidos llega con el turno ya lleno. La
asignación tiene que ser justa, por orden de llegada (NFR-04). En la votación del grupo la lista de espera
quedó empatada: se discutió si era sobredimensionar.

## Decisión

Vamos a guardar en **lista de espera** las inscripciones que llegan con el turno lleno, con su
**posición** en ese turno, en lugar de rechazarlas. Se decide en la misma transacción con bloqueo que el
cupo (ADR-003), así que el orden de la lista es el orden de llegada.

Cuando se **cancela** una inscripción confirmada, en la misma transacción se promueve a la primera de la
lista de espera de ese turno y se renumeran las demás. Si el administrador del sistema **amplía el cupo**
de un turno, se promueve en orden a tantas como cupos nuevos haya. Un chico con la inscripción cancelada
puede volver a inscribirse.

## Alternativas

- **Rechazar cuando no hay cupo (409):** más simple, pero si alguien se da de baja el municipio no sabe
  a quién le corresponde el lugar, y las familias tienen que volver a intentar sin saber cuándo.
- **Sorteo al cierre de la inscripción:** también es justo, pero el escenario pide orden de llegada y
  agrega un proceso al final de las 3 semanas.
- **Lista de espera única para toda la colonia:** menos datos, pero las familias eligen turno por
  horario y sede.

## Consecuencias

- Se gana: el orden de llegada queda registrado también para los que no entraron y la oficina cubre las
  bajas sin discutir a quién le toca.
- El costo es bajo: un estado más (`LISTA_ESPERA`) y una columna (`posicion_espera`), sin tablas ni
  procesos nuevos.
- Se resigna: la promoción es automática y no avisa a la familia; hoy se entera al consultar sus
  inscripciones (un aviso por correo quedaría para una próxima versión).

## NFRs

- Favorece: equidad (orden de llegada) y usabilidad para la oficina.
- Perjudica levemente: la simplicidad del modelo (un estado y una columna más).

## Confirmación

`verificacion/verificar.py`: los pedidos que llegan con el turno lleno quedan con posiciones
consecutivas, y al cancelar la confirmada la primera de la lista pasa a confirmada (NFR-04).
