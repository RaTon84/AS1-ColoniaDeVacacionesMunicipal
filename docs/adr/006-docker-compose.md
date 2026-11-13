# ADR-006: Despliegue con Docker Compose, versiones fijas y valores por defecto

**Estado:** Aceptada
**Fecha:** 29/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

La restricción del escenario es la más exigente: el sistema se usa 3 semanas al año y al año siguiente se
tiene que volver a levantar sin que nadie se acuerde de cómo. Corre en un servidor municipal compartido y
lo mantiene una sola persona. La consigna pide levantar todo con un solo comando. ¿Cómo empaquetamos y
desplegamos el sistema para que dentro de un año levante igual que hoy?

## Drivers de la decisión

- NFR-03 Desplegabilidad y recuperación (la restricción del escenario).
- NFR-02 Costo: aprovechar el servidor compartido sin chocar con otros sistemas.
- NFR-01 Mantenibilidad: sin instructivos que haya que recordar.
- Consigna: un solo comando de docker o podman compose.

## Opciones consideradas

- Docker Compose con imágenes de versión fija y valores por defecto
- Instalación manual en el servidor
- Kubernetes
- Docker Compose con imágenes `latest`
- Docker Compose con variables obligatorias en un `.env`

## Resultado de la decisión

Opción elegida: «Docker Compose con versiones fijas y valores por defecto», porque es lo único que levanta
con un comando en una máquina limpia y se descarga igual dentro de un año. Concretamente:

- imágenes con versión fija (`postgres:16.4-alpine`, `keycloak:26.0.0`, `wiremock:3.9.1`,
  `swagger-ui:v5.17.14`, y para construir la app `node:22.12.0` y `python:3.12.7-slim`);
- una imagen de la app que incluye la SPA compilada y corre con un usuario sin privilegios;
- valores por defecto para todas las variables: no hace falta crear un `.env`;
- migraciones, datos iniciales y realm de Keycloak automáticos al arrancar (ADR-003, ADR-005);
- red interna con los servicios llamados por nombre; la base no publica puertos;
- `depends_on` con healthcheck: la app espera a que PostgreSQL responda.

### Consecuencias

- Bueno, porque cualquiera con Docker levanta el sistema con `docker compose up -d --build`.
- Bueno, porque los contenedores aíslan al sistema del resto del servidor compartido.
- Malo, porque las versiones fijas no reciben parches de seguridad solas: hay que actualizarlas a
  propósito antes de cada temporada.
- Malo, porque las contraseñas por defecto son de demo y están en el repo; en el servidor real se cambian
  en el `.env`.
- Malo, porque no hay HTTPS en el TP: en producción, TLS lo pone el proxy del municipio.

### Confirmación

En una máquina con Docker y sin nada más: clonar el repo y correr `docker compose up -d --build`
levanta los cinco servicios con la base migrada, los turnos cargados y los usuarios de prueba. Se mide el
tiempo de arranque y, después de `docker compose restart`, que las inscripciones sigan estando.
Resultado en `docs/VERIFICACION.md` (NFR-03).

## Pros y contras de las opciones

### Compose con versiones fijas y valores por defecto

- Bueno, porque es reproducible y no requiere pasos previos.
- Malo, porque hay que tener Docker y las imágenes ocupan espacio en disco.

### Instalación manual

- Bueno, porque no requiere Docker.
- Malo, porque depende de un instructivo que nadie va a recordar y choca con otros sistemas del servidor.

### Kubernetes

- Bueno, porque da alta disponibilidad y escalado.
- Malo, porque está pensado para muchos nodos: para una sola persona y un servidor es sobredimensionar.

### Imágenes `latest`

- Bueno, porque siempre están actualizadas.
- Malo, porque al año siguiente pueden traer cambios incompatibles y el sistema podría no levantar.

### Variables obligatorias en un `.env`

- Bueno, porque es más explícito.
- Malo, porque es un paso más que se olvida.

## Más información

Clase 10 (Docker y Compose) y Clase 13 (Twelve-Factor: configuración en variables de entorno, logs a la
salida estándar, paridad entre entornos).
