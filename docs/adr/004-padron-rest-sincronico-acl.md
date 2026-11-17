# ADR-004: Padrón de residentes por REST sincrónico con capa anticorrupción

**Estado:** Aceptada
**Fecha:** 15/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

Solo pueden inscribirse chicos con domicilio en la jurisdicción (se consulta con el DNI del chico), y eso lo sabe un sistema
externo: el padrón de residentes, que no controlamos y que para el TP se simula con WireMock. El padrón
puede estar lento o caído. ¿Cómo nos integramos con él sin que sus detalles ni sus fallas rompan las
reglas de negocio?

## Drivers de la decisión

- Regla de negocio: la residencia se valida siempre, sin excepciones.
- Usabilidad: el tutor tiene que saber en el momento si la inscripción se aceptó.
- NFR-06 Disponibilidad: el sistema tiene que responder bien cuando el padrón falla.
- NFR-01 Mantenibilidad: cambiar el mock por el padrón real sin tocar las reglas.

## Opciones consideradas

- REST sincrónico con capa anticorrupción (ACL)
- Validación asincrónica (inscribir y validar después)
- Copia local del padrón con sincronización periódica
- Llamar al padrón directo desde el servicio, sin ACL
- Aceptar la inscripción si el padrón está caído

## Resultado de la decisión

Opción elegida: «REST sincrónico con ACL», porque es la única que aplica siempre la regla y responde en el
momento. Toda la comunicación pasa por un cliente propio (`app/integrations/padron.py`) que traduce la
respuesta externa a «es residente / no es residente», aplica un timeout de 3 segundos y, si el padrón no
responde o falla, informa `PadronNoDisponible`, que la API devuelve como **503 con `Retry-After`** sin
crear la inscripción.

### Consecuencias

- Bueno, porque el tutor sabe en el momento si quedó inscripto y la regla se aplica siempre.
- Bueno, porque si el padrón real tiene otro formato se cambia un solo archivo.
- Bueno, porque la consulta se hace antes de bloquear la fila del turno, así que no frena a las demás
  inscripciones (ADR-003).
- Malo, porque si el padrón está caído nadie se puede inscribir. Es un riesgo aceptado: la inscripción
  dura 3 semanas, se informa con 503 para reintentar y nadie pierde un lugar ya asignado.

### Confirmación

El mock tiene DNIs de prueba para los tres casos (ver README): residente → 201, no residente → 422 y
padrón con error → 503 con `Retry-After`, sin crear la inscripción. También con
`docker compose stop wiremock`: la inscripción responde 503 en menos de 3,5 s y el resto del sistema sigue
atendiendo. Resultado en `docs/VERIFICACION.md` (NFR-06).

## Pros y contras de las opciones

### REST sincrónico con ACL

- Bueno, porque responde en el momento y aísla al dominio del formato externo.
- Malo, porque la disponibilidad de la inscripción depende de la del padrón.

### Validación asincrónica

- Bueno, porque la inscripción no depende de que el padrón esté arriba.
- Malo, porque el tutor no sabría en el momento si quedó inscripto, y un no residente ocuparía un cupo
  hasta que llegue la validación.

### Copia local del padrón

- Bueno, porque no depende de la disponibilidad del padrón.
- Malo, porque hay que construir y operar la sincronización, y los datos pueden quedar desactualizados.

### Llamar directo, sin ACL

- Bueno, porque es menos código.
- Malo, porque el formato externo se filtra al dominio y cambiar de padrón obliga a tocar las reglas.

### Aceptar si el padrón está caído

- Bueno, porque es lo más disponible.
- Malo, porque rompe la regla de negocio.

## Más información

Clase 6 (integración sincrónica y asincrónica). Revisar si el padrón real resultara poco confiable: la
alternativa sería la copia local.
