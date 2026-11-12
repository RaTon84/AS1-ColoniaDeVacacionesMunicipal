# ADR-006: Despliegue con Docker Compose, versiones fijas y valores por defecto

**Estado:** Aceptada (29/10/2026)

## Contexto

La restricción del escenario es la más exigente: el sistema se usa 3 semanas al año y al año siguiente
se tiene que volver a levantar sin que nadie se acuerde de cómo. Corre en un servidor municipal
compartido con otros sistemas y lo mantiene una sola persona. La consigna pide levantar todo con un
solo comando.

## Decisión

Vamos a desplegar todo con **Docker Compose** y un solo comando, `docker compose up -d --build`:

- **Imágenes con versión fija** (`postgres:16.4-alpine`, `keycloak:26.0.0`, `wiremock:3.9.1`,
  `swagger-ui:v5.17.14`, y para construir la app `node:22.12.0` y `python:3.12.7-slim`): dentro de un
  año se descarga exactamente lo mismo.
- **Una imagen de la app que incluye la SPA compilada** y corre con un usuario sin privilegios (no root).
- **Valores por defecto para todas las variables:** no hace falta crear un `.env`; `.env.example`
  documenta qué se puede cambiar.
- **Arranque automático:** migraciones y datos iniciales al iniciar la app (ADR-003) y realm de Keycloak
  importado (ADR-005).
- **Red interna y puertos mínimos:** los servicios se llaman por nombre (`postgres`, `keycloak`,
  `wiremock`); la base no publica puertos; solo se publican los que usa el navegador (app 8000, Keycloak
  8080, Swagger UI 8082) y el del mock (8081) para mostrarlo en la demo.
- **`depends_on` con healthcheck:** la app espera a que PostgreSQL responda.

## Alternativas

- **Instalación manual en el servidor (Python, PostgreSQL y Keycloak a mano):** sin Docker, pero depende
  de un instructivo que nadie va a recordar y choca con otros sistemas del servidor compartido.
- **Kubernetes:** pensado para muchos nodos y alta disponibilidad; para una sola persona y un servidor
  es sobredimensionar.
- **Imágenes con `latest`:** siempre actualizadas, pero el año siguiente pueden traer cambios
  incompatibles y el sistema podría no levantar.
- **Variables obligatorias en un `.env` sin valores por defecto:** más explícito, pero es un paso más
  para olvidarse.

## Consecuencias

- Se gana: cualquiera con Docker levanta el sistema con un comando y una máquina limpia; los contenedores
  aíslan al sistema del resto del servidor compartido.
- Se resigna: hay que tener Docker instalado; las imágenes ocupan espacio en disco; las versiones fijas
  no reciben parches de seguridad solas, y hay que actualizarlas a propósito antes de cada temporada.
- Las contraseñas por defecto son de demo y están en el repo; en el servidor real se cambian en el `.env`.
- Sin HTTPS en el TP: en producción, TLS se agrega con el proxy del municipio.

## NFRs

- Favorece: mantenibilidad y recuperabilidad (la restricción del escenario), portabilidad y costo.
- Perjudica levemente: el consumo de disco y la seguridad si no se cambian las contraseñas de demo.

## Confirmación

En una máquina con Docker y sin nada más: clonar el repo y correr `docker compose up -d --build`
levanta los cinco servicios con la base migrada, los turnos cargados y los usuarios de prueba. Se mide el
tiempo de arranque y, después de `docker compose restart`, que las inscripciones sigan estando.
Resultado en `docs/VERIFICACION.md` (NFR-03).
