# Colonia de Vacaciones Municipal · TP 6A

Trabajo Práctico Integrador de **Arquitectura de Software 1** (UNAHUR, 2do cuatrimestre 2026).
Grupo **Los Betos** · Casillero **6A · Colonia de vacaciones · Municipio chico**.

Sistema de inscripción a la colonia de vacaciones de un municipio chico: un tutor (o un administrativo
en la oficina) inscribe a un chico de 6 a 12 años en un turno con cupo, en orden de llegada, sin que un
chico quede inscripto dos veces y solo si vive en la jurisdicción (se valida contra el padrón de residentes).

## Arquitectura

- Monolito modular con Clean Architecture liviana ([ADR-001](docs/adr/001-monolito-modular.md)).
- Backend: Python + FastAPI. Frontend: React + Vite, compilado y servido por el mismo backend.
- Base de datos: PostgreSQL.
- Identidad: Keycloak (OIDC, Authorization Code + PKCE).
- Padrón de residentes simulado con WireMock.
- Todo se levanta con Docker Compose.

Documentación completa en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y decisiones en [docs/adr](docs/adr).

## Estructura del repositorio

| Carpeta | Contenido | Issue |
|---|---|---|
| `/` | `docker-compose.yml`, `.env.example`, este README | #1 Esqueleto e infraestructura |
| `keycloak/` | Realm `colonia` con roles y usuarios demo; tema visual del login | #1 y #3 |
| `wiremock/` | Respuestas simuladas del padrón de residentes | #1 |
| `backend/` | API FastAPI, dominio, migraciones (Alembic) y datos iniciales | #2 Backend |
| `frontend/` | SPA en React con las vistas por rol | #3 Frontend y login |
| `verificacion/` | Script de verificación de NFRs y sus resultados | #4 Tests y verificación de NFRs |
| `docs/` | Documento de arquitectura, ADRs, NFRs, mockups y planilla de decisiones | Todos |

## Levantar el sistema

Requisito: Docker Desktop (o Podman Desktop) funcionando.

```bash
docker compose up -d --build
```

No hace falta crear un `.env`: cada variable tiene un valor por defecto. Para cambiar alguno, copiar
`.env.example` como `.env`.

Para empezar de cero (borra los datos de PostgreSQL):

```bash
docker compose down -v
docker compose up -d --build
```

## URLs

| Servicio | URL |
|---|---|
| Aplicación | http://localhost:8000 |
| Documentación de la API (Swagger UI, desde `docs/openapi.yaml`) | http://localhost:8082 |
| Keycloak | http://localhost:8080 (consola: `/admin`, usuario `admin`, clave `admin_demo_cambiar`) |
| Mock del padrón (WireMock) | http://localhost:8081/__admin/ |

## Usuarios de prueba

| Rol | Usuario | Contraseña |
|---|---|---|
| Tutor | `tutor1` | `Tutor123!` |
| Administrativo | `admin1` | `Admin123!` |
| Administrador del sistema | `sysadmin1` | `SysAdmin123!` |

El administrador del sistema registra más cuentas del personal (administrativos y administradores del
sistema), las da de baja o cambia su rol desde **Usuarios y perfiles**. Las cuentas nuevas se crean con
una clave temporal que hay que cambiar en el primer ingreso.

Si ya tenías el sistema levantado de antes, recreá Keycloak para que importe el realm actualizado:
`docker compose up -d --force-recreate keycloak` (se pierden las cuentas creadas a mano).

## DNIs de prueba del padrón

El padrón se consulta con el **DNI del chico**.

| DNI del chico | Respuesta del mock |
|---|---|
| `53148263`, `53871642`, `54529317`, `55268431`, `55736924`, `56319587`, `57042863`, `57861429`, `58623741`, `59348276` | Residente |
| 10 dígitos que empiezan con `9` (por ejemplo `9000000001`) | Residente (reservados para la verificación automática) |
| `50000000` | Padrón caído (503) |
| Cualquier otro | No residente |

## Verificación de NFRs

Con el sistema levantado (sobre una base de prueba):

```bash
docker compose --profile verificacion run --rm verificador
```

Prueba seguridad, reglas de negocio, concurrencia en el último cupo, padrón caído y la regla de
arquitectura, y deja el resultado en `verificacion/resultados/`. Qué se verifica, cómo y los resultados
obtenidos: [docs/VERIFICACION.md](docs/VERIFICACION.md).

## Forma de trabajo

Cada cambio va en una rama propia con un pull request que revisa otro integrante y que cierra su issue
(`Closes #N` en la descripción). Las partes se integran en orden: #1 → #2 → #3 → #4.

## Equipo

Lorena Denhoff · Cristian Luna · Hernán Viltez · Martín
