# Verificación de NFRs · TP 6A

Qué verificamos, cómo lo hicimos y qué resultado obtuvimos, para cada NFR de
[ARQUITECTURA.md](ARQUITECTURA.md#4-nfrs-escritos-como-escenarios). Cada NFR está escrito como escenario
(fuente, estímulo, artefacto, entorno, respuesta y medida); acá está la prueba que lo confirma y la
evidencia que queda en el repo.

## Cómo se corre

Todo corre en contenedores: no hace falta instalar nada además de Docker. Usar una base de prueba,
porque el script deja inscripciones de prueba.

```bash
# 0. Sistema limpio
docker compose down -v
docker compose up -d --build

# 1. Pruebas principales (seguridad, reglas, concurrencia, padrón con error, arquitectura)
docker compose --profile verificacion run --rm verificador

# 2. Padrón detenido
docker compose stop wiremock
docker compose --profile verificacion run --rm verificador padron-apagado
docker compose start wiremock

# 3. Persistencia después de reiniciar
docker compose restart
docker compose --profile verificacion run --rm verificador persistencia

# 4. Consumo de recursos (con el sistema en uso)
docker stats --no-stream
```

El script es [verificacion/verificar.py](../verificacion/verificar.py) (solo biblioteca estándar de
Python). Inicia sesión como la SPA, con Authorization Code + PKCE, así que no necesita permisos especiales
en Keycloak. Cada corrida guarda su resultado en `verificacion/resultados/AAAAMMDD-HHMM-<fase>.md`.

**Entorno de la medición:** completar con la máquina donde se corrió (procesador, RAM, sistema operativo,
versión de Docker). Los tiempos medidos en una notebook no son la capacidad del servidor municipal:
sirven para comparar entre corridas.

## Resumen

| NFR | Medida del escenario | Cómo se verificó | Resultado | |
|---|---|---|---|---|
| NFR-01 Mantenibilidad | 0 dependencias del framework web en reglas y repositorios; cambiar edades o temporada sin tocar código | Fitness function (análisis del código) + panel del administrador del sistema | _pendiente de correr_ | ⏳ |
| NFR-02 Costo | Todo el sistema en menos de 1,5 GB de RAM; 0 licencias pagas ni servicios en la nube | `docker stats` con el sistema en uso | _pendiente de correr_ | ⏳ |
| NFR-03 Desplegabilidad y recuperación | 1 comando, menos de 10 min en una máquina limpia; 100 % de las inscripciones después de reiniciar | Cronómetro del `up` + fase `persistencia` | _pendiente de correr_ | ⏳ |
| NFR-04 Integridad y equidad | 30 pedidos simultáneos por el último cupo → 1 confirmada, 0 sobreasignados, 0 duplicados | Script con pedidos en paralelo | _pendiente de correr_ | ⏳ |
| NFR-05 Seguridad | 100 % de los accesos indebidos rechazados (401, 403 o 404) | Script con los tres usuarios y llamadas directas a la API | _pendiente de correr_ | ⏳ |
| NFR-06 Disponibilidad | Padrón caído → 503 con `Retry-After` en menos de 3,5 s, 0 inscripciones sin validar | DNI de prueba + `docker compose stop wiremock` | _pendiente de correr_ | ⏳ |

## Detalle por NFR

### NFR-01 · Mantenibilidad (NFR estrella)

- **Qué se verificó:** que la regla de dependencias de la Clean Architecture liviana (ADR-002) se cumple
  en el código, y que preparar la temporada siguiente no requiere tocar código.
- **Cómo:** fitness function automática en `verificar.py`: analiza con `ast` cada `service.py` y
  `repository.py` de `backend/app/modules` y falla si alguno importa `fastapi` o `starlette`. Manual:
  desde el panel del administrador del sistema se cambia la temporada, las edades y el período.
- **Resultado:** _pendiente de correr._
- **Si no alcanza con esto:** la táctica que lo sostiene es la separación en módulos con dependencias en
  un solo sentido; la fitness function evita la erosión (que la regla quede en el documento y se rompa en
  el código).

### NFR-02 · Costo

- **Qué se verificó:** que el sistema entra en el servidor municipal compartido sin infraestructura nueva.
- **Cómo:** `docker stats --no-stream` después de correr la verificación principal. Se suma la columna
  `MEM USAGE` de los cinco contenedores.
- **Resultado:** _pendiente de correr._ Todas las piezas son de código abierto y autoalojadas (sin
  licencias ni servicios en la nube).

### NFR-03 · Desplegabilidad y recuperación operativa

- **Qué se verificó:** que alguien que no instaló el sistema lo pone en marcha con un comando, y que los
  datos sobreviven a un reinicio.
- **Cómo:** en una máquina con Docker y sin imágenes descargadas, cronometrar `docker compose up -d --build`
  hasta que `http://localhost:8000/api/v1/health` responde 200 (en PowerShell:
  `Measure-Command { docker compose up -d --build }`). Después, la fase `persistencia` del script compara
  las inscripciones antes y después de `docker compose restart`.
- **Resultado:** _pendiente de correr._

### NFR-04 · Integridad y consistencia de datos (equidad en el último cupo)

- **Qué se verificó:** que nunca se asignan más cupos de los que hay, que un chico no queda inscripto dos
  veces y que el orden de llegada se respeta también en la lista de espera.
- **Cómo:** `verificar.py`
  1. deja un turno con un solo cupo libre (con la distribución de cupos del administrador del sistema);
  2. lanza 30 pedidos que arrancan juntos, mitad como tutor y mitad como administrativo;
  3. comprueba 1 confirmada, 29 en lista de espera con posiciones consecutivas y 0 cupos libres;
  4. lanza 10 pedidos simultáneos del mismo chico: 1 × 201 y 9 × 409;
  5. cancela la confirmada y comprueba que la primera de la lista pasa a confirmada;
  6. reinscribe al chico cancelado (201) y restaura la distribución original.
  También comprueba 201 con `Location`, 409 duplicado, 422 no residente, 422 edad fuera de rango y 422 datos
  inválidos.
- **Resultado:** _pendiente de correr._

### NFR-05 · Seguridad

- **Qué se verificó:** que la API controla el acceso por sí misma, aunque alguien la llame sin pasar por
  la SPA.
- **Cómo:** `verificar.py` inicia sesión con PKCE con `tutor1`, `admin1` y `sysadmin1`, y prueba: sin token
  → 401 con `WWW-Authenticate: Bearer` y `application/problem+json`; token con la firma alterada → 401;
  tutor en el listado administrativo → 403; administrativo en la configuración de temporada → 403; tutor
  que pide una inscripción cargada por otra persona → 404. Gestión de cuentas: el administrativo recibe 403
  en `/admin/usuarios`; el administrador del sistema registra un administrativo (201 con `Location`), lo da
  de baja (habilitado = false) y recibe 409 si intenta quitarse su propio rol. Las reglas de la gestión de
  cuentas tienen además tests con Keycloak simulado: `docker compose exec app pytest tests/test_usuarios.py`.
- **Resultado:** _pendiente de correr._

### NFR-06 · Disponibilidad

- **Qué se verificó:** qué pasa cuando falla el sistema externo del que dependemos (el padrón).
- **Cómo:** con el DNI de prueba `50000000` el mock responde con error; además se detiene el contenedor
  con `docker compose stop wiremock` (ingeniería del caos en pequeño, Clase 13: hipótesis, inyectar la
  falla, observar y restaurar).
- **Hipótesis:** la inscripción responde 503 con `Retry-After` sin crear nada, el health avisa qué
  componente falla y el resto del sistema sigue atendiendo.
- **Resultado:** _pendiente de correr._

## Lo que no verificamos y por qué

- **Carga masiva:** el escenario son 1.500 familias en 3 semanas, no un pico de miles por segundo. Lo que
  importa es la equidad en el último cupo (NFR-04), que sí se prueba con pedidos simultáneos. Si el pico
  creciera, la táctica sería una cola delante de la inscripción (ver la evaluación en ARQUITECTURA.md).
- **HTTPS y MFA:** fuera del alcance del TP (ADR-006); en producción, TLS lo pone el proxy del municipio
  y MFA se activa en Keycloak sin tocar la aplicación.
