# ADR-004: Padrón de residentes por REST sincrónico con capa anticorrupción

**Estado:** Aceptada (15/10/2026)

## Contexto

Solo pueden inscribirse chicos con domicilio en la jurisdicción, y eso lo sabe un sistema externo: el
padrón de residentes, que no controlamos y que para el TP se simula con WireMock. El tutor necesita
saber en el momento si la inscripción se aceptó. El padrón puede estar lento o caído.

## Decisión

Vamos a consultar el padrón **por REST, de forma sincrónica**, con el DNI del tutor, durante la
inscripción. Toda la comunicación pasa por un cliente propio (`app/integrations/padron.py`) que funciona
como **capa anticorrupción**: traduce la respuesta externa a un simple «es residente / no es residente»,
aplica un timeout de 3 segundos y, si el padrón no responde o falla, informa `PadronNoDisponible`, que
la API devuelve como **503 con `Retry-After`** sin crear la inscripción.

## Alternativas

- **Asincrónica (inscribir y validar después):** el tutor no sabría en el momento si quedó inscripto, y
  un chico no residente ocuparía un cupo hasta que llegue la validación.
- **Copia local del padrón (sincronización periódica):** no depende de que el padrón esté arriba, pero
  hay que construir y operar la sincronización, y los datos pueden quedar desactualizados.
- **Llamar al padrón directo desde el servicio, sin ACL:** menos código, pero el formato externo se
  filtraría al dominio y cambiar de padrón obligaría a tocar las reglas.
- **Aceptar la inscripción si el padrón está caído:** más disponible, pero rompe la regla de negocio.

## Consecuencias

- Se gana: respuesta inmediata al tutor, regla de residencia siempre aplicada y un único archivo para
  cambiar si el padrón real tiene otro formato.
- Se resigna: si el padrón está caído no se puede inscribir (se informa con 503 y se reintenta). Es un
  riesgo aceptado: la inscripción dura 3 semanas y un corte del padrón no hace perder el lugar a nadie
  que ya esté inscripto.
- La consulta se hace antes de bloquear la fila del turno, para no frenar a las demás inscripciones
  mientras se espera al padrón (ADR-003).

## NFRs

- Favorece: consistencia (la regla se cumple siempre), mantenibilidad y testeabilidad (el mock).
- Perjudica: disponibilidad de la inscripción, que depende de la del padrón.

## Confirmación

El mock tiene DNIs de prueba para los tres casos (ver README): residente → 201, no residente → 422
y padrón con error → 503 con `Retry-After`, sin crear la inscripción. También con
`docker compose stop wiremock`: la inscripción responde 503 en menos de 3,5 s y el resto del sistema sigue
atendiendo. Resultado en `docs/VERIFICACION.md` (NFR-06).
