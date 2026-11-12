# ADR-008: Tres roles: tutor, administrativo y administrador del sistema

**Estado:** Aceptada
**Fecha:** 29/10/2026 · **Decisores:** grupo Los Betos (en la votación quedó empatado; se decidió el 29/10)

## Contexto y problema

La consigna pide al menos dos roles. Hay familias que inscriben por su cuenta y administrativos que
inscriben en la oficina y ven las listas. Además, cada año alguien tiene que activar la temporada nueva,
fijar las edades, el período de inscripción y el reparto de cupos, y ver si los servicios responden. ¿Qué
roles definimos y qué puede hacer cada uno?

## Drivers de la decisión

- NFR-05 Seguridad: mínimo privilegio, controlado en la API.
- NFR-01 Mantenibilidad: preparar la temporada siguiente sin tocar código.
- Consigna: al menos dos roles, cada uno demostrable con un usuario de prueba.

## Opciones consideradas

- Tres roles: tutor, administrativo y administrador del sistema
- Dos roles: tutor y administrativo
- Un rol administrativo para todo lo que no es del tutor
- Permisos finos por operación (scopes)

## Resultado de la decisión

Opción elegida: «Tres roles», porque cada uno tiene una función propia en la API:

| Rol | Puede |
|---|---|
| `tutor` | Ver turnos, inscribir, ver y cancelar sus propias inscripciones |
| `administrativo` | Lo anterior, inscribir en nombre de una familia, y ver y cancelar todas las inscripciones |
| `administrador_sistema` | Lo anterior; ver el estado de los servicios; configurar la temporada, las edades, el período de inscripción y la distribución de cupos |

Los permisos se controlan en el backend con `require_roles(...)`; la SPA solo oculta lo que el rol no
puede usar. Los usuarios y sus roles se gestionan en Keycloak (ADR-005).

### Consecuencias

- Bueno, porque cada rol tiene una razón de existir y se puede mostrar en la demo.
- Bueno, porque preparar la temporada siguiente no requiere tocar código.
- Malo, porque hay un rol más que mantener en el realm y en las pruebas de permisos.

### Confirmación

`verificacion/verificar.py`: el tutor recibe 403 en el listado administrativo y el administrativo recibe
403 en la configuración de temporada (NFR-05).

## Pros y contras de las opciones

### Tres roles

- Bueno, porque separa operación diaria de configuración técnica.
- Malo, porque suma un rol.

### Dos roles

- Bueno, porque cumple la consigna con lo mínimo.
- Malo, porque la configuración de la temporada quedaría en manos de la oficina, o solo en la consola de
  Docker.

### Un rol administrativo para todo

- Bueno, porque es más simple.
- Malo, porque el personal de la oficina podría cambiar cupos o edades en plena inscripción.

### Permisos finos por operación

- Bueno, porque es lo más flexible.
- Malo, porque sobredimensiona un sistema con pocas operaciones.

## Más información

Clase 12 (RBAC y mínimo privilegio). Relacionado con ADR-005.
