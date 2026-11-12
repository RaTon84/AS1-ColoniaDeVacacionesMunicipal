# ADR-008: Tres roles: tutor, administrativo y administrador del sistema

**Estado:** Aceptada (29/10/2026)

## Contexto

La consigna pide al menos dos roles. El escenario tiene familias que inscriben por su cuenta y
administrativos que inscriben en la oficina y ven las listas. Además, el sistema se vuelve a poner en
marcha cada año: alguien tiene que activar la temporada nueva, fijar las edades, el período de
inscripción y el reparto de cupos, y ver si los servicios responden, sin tocar el código.

## Decisión

Vamos a usar **tres roles del realm de Keycloak**, cada uno con una función concreta en la API:

| Rol | Puede |
|---|---|
| `tutor` | Ver turnos, inscribir, ver y cancelar sus propias inscripciones |
| `administrativo` | Lo anterior, inscribir en nombre de una familia, y ver y cancelar todas las inscripciones |
| `administrador_sistema` | Lo anterior; ver el estado de los servicios; configurar la temporada, las edades, el período de inscripción y la distribución de cupos |

Los permisos se controlan en el backend con `require_roles(...)`; la SPA solo oculta lo que el rol no
puede usar.

## Alternativas

- **Solo dos roles (tutor y administrativo):** cumple la consigna, pero la configuración de la temporada
  y el estado técnico quedarían en manos del personal de la oficina, o solo en la consola de Docker.
- **Usar el rol de administrativo para todo:** el personal de la oficina podría cambiar cupos o edades
  en plena inscripción sin necesitarlo.
- **Permisos finos por operación (scopes):** más flexibles, pero sobredimensionan un sistema con pocas
  operaciones.

## Consecuencias

- Se gana: cada rol tiene una razón de existir y se puede mostrar en la demo con su usuario de prueba;
  preparar la temporada siguiente no requiere tocar código.
- Se resigna: un rol más que mantener en el realm y en las pruebas de permisos.
- Los usuarios y sus roles se gestionan en Keycloak, no en la aplicación (ADR-005).

## NFRs

- Favorece: seguridad (mínimo privilegio), mantenibilidad y operabilidad.
- Perjudica levemente: la simplicidad del modelo de permisos.

## Confirmación

`verificacion/verificar.py`: el tutor recibe 403 en el listado administrativo y el administrativo
recibe 403 en la configuración de temporada (NFR-05).
