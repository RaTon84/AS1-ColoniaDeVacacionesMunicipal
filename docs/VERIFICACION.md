
# Verificación de NFRs · TP 6A

Qué verificamos, cómo lo hicimos y qué resultados obtuvimos para cada NFR de [ARQUITECTURA.md](ARQUITECTURA.md#4-nfrs-escritos-como-escenarios).

Cada NFR está planteado como un escenario de calidad (fuente, estímulo, artefacto, entorno, respuesta y medida). Este documento registra las pruebas realizadas y las evidencias conservadas en el repositorio.

## Cómo se corre

Todo corre en contenedores. No hace falta instalar herramientas de prueba adicionales a Docker.

**Importante:** utilizar una base de prueba porque el verificador crea y modifica inscripciones. `docker compose down -v` elimina los volúmenes de datos administrados por Compose.

```bash
# 0. Sistema limpio
docker compose down -v
docker compose up -d --build --wait

# 1. Pruebas principales
docker compose --profile verificacion run --rm verificador

# 2. Padrón detenido
docker compose stop wiremock
docker compose --profile verificacion run --rm verificador padron-apagado
docker compose start wiremock

# 3. Persistencia después de reiniciar
docker compose restart
docker compose --profile verificacion run --rm verificador persistencia

# 4. Consumo de recursos
docker stats --no-stream
```

El script es [verificacion/verificar.py](../verificacion/verificar.py). Utiliza la biblioteca estándar de Python e inicia sesión mediante Authorization Code + PKCE.

Cada ejecución guarda su resultado en `verificacion/resultados/`.


**Entorno de la medición:**

- **Sistema operativo:** Microsoft Windows 10 Enterprise, versión 22H2 (compilación 19045), 64 bits.
- **Procesador:** Intel Core i5-7400 @ 3.00 GHz (4 núcleos).
- **Memoria RAM instalada:** 16 GB.
- **Equipo:** PC de escritorio MSI MS-7A15.
- **Docker:** Docker version 29.8.2.
- **Docker Compose:** Docker Compose version v5.6.0.
- **Terminal utilizada:** Git Bash (MINGW64).
- **Fecha de las verificaciones:** 18/11/2026.

Las mediciones de tiempo y consumo de recursos se realizaron en una computadora de desarrollo. Los resultados corresponden al entorno probado y no representan necesariamente el rendimiento del servidor municipal de producción.


## Resumen

| NFR | Medida del escenario | Cómo se verificó | Resultado | Estado |
|---|---|---|---|---|
| NFR-01 Mantenibilidad | 0 dependencias del framework web en servicios y repositorios; modificar parámetros sin tocar código | Fitness function + prueba manual del panel administrativo | 0 violaciones en 4 archivos; configuración de edades, cupos y período comprobada manualmente | OK en alcance probado |
| NFR-02 Costo | Sistema con menos de 1,5 GB de RAM; sin licencias pagas ni servicios cloud requeridos | `docker stats` durante el uso y revisión de componentes | Máximo observado: 975,56 MiB en los 5 servicios principales | Parcial |
| NFR-03 Desplegabilidad y recuperación | Despliegue con un comando en menos de 10 minutos; persistencia después de reiniciar | Despliegue con volúmenes nuevos, cronómetro y fase `persistencia` | 65,627 s; 4 turnos y 148 inscripciones iniciales; 20/20 estados conservados | OK en entorno probado |
| NFR-04 Integridad y equidad | 30 pedidos simultáneos por el último cupo: 1 confirmada, 0 sobrecupos, 0 duplicados | Script con pedidos concurrentes | 1 confirmada, 29 en espera, 0 sobrecupos; duplicados rechazados | OK |
| NFR-05 Seguridad | Accesos indebidos rechazados con 401, 403 o 404 | Script con tres usuarios y llamadas directas a la API | PKCE, roles, respuestas 401/403/404 y gestión de cuentas verificados | OK |
| NFR-06 Disponibilidad | Padrón caído: 503 con `Retry-After` en menos de 3,5 s, sin crear inscripciones no validadas | DNI de prueba + detención de WireMock | 503, `Retry-After: 30`, 3007 ms; health degradado y turnos operativos | OK |

## Detalle por NFR

### NFR-01 · Mantenibilidad (NFR estrella)

- **Qué se verificó:** que la regla de dependencias de la Clean Architecture liviana (ADR-002) se cumpla en el código y que los parámetros de negocio puedan modificarse sin editar el código fuente.

- **Cómo:** la fitness function de `verificar.py` analiza mediante `ast` los archivos `service.py` y `repository.py` de los módulos del backend y detecta importaciones indebidas de `fastapi` o `starlette`.

  Además, se realizó una verificación manual desde el panel del administrador del sistema, modificando parámetros de la colonia y observando su representación en la interfaz de consulta.

- **Resultado automático:** 4 archivos analizados, 0 violaciones detectadas.

- **Resultado manual:** se comprobó la configuración de edades, distribución de cupos y período de inscripción mediante la interfaz administrativa.

- **Evidencias:**
  - `verificacion/resultados/20261118-2252-principal.md`
  - `verificacion/resultados/nfr01-antes.png` 
  - `verificacion/resultados/nfr01-despues.png`

- **Conclusión:** se verificó la separación del framework en los archivos analizados y la configuración de parámetros mediante la interfaz, sin necesidad de modificar código.

- **Alcance:** la fitness function comprueba una regla arquitectónica específica; no constituye un análisis exhaustivo de todas las dependencias del proyecto.

### NFR-02 · Costo

- **Qué se verificó:** que el sistema pueda funcionar dentro del límite de memoria establecido para el servidor municipal compartido.

- **Cómo:** se utilizó `docker stats` con el sistema en uso y se registraron muestras del consumo de memoria de los cinco servicios principales.

- **Resultado:**
  - Máximo simultáneo observado: **975,56 MiB**.
  - Límite establecido: **1536 MiB**.
  - El consumo observado se mantuvo por debajo del límite.

- **Evidencia:** `verificacion/resultados/consumo-ram.txt`.

- **Conclusión:** se cumple el criterio de consumo de memoria en el entorno y período medidos.

- **Alcance:** no se incluyó el contenedor opcional del verificador ni se realizó una prueba de carga sostenida de producción. La arquitectura utiliza componentes autoalojados y de código abierto, pero no se efectuó una auditoría independiente de licencias y costos operativos.

### NFR-03 · Desplegabilidad y recuperación operativa

- **Qué se verificó:** que el sistema pueda desplegarse de manera reproducible mediante Docker Compose y que los datos persistan después de reiniciar los contenedores.

- **Cómo:**
  1. Se eliminaron los contenedores y volúmenes mediante `docker compose down -v`.
  2. Se ejecutó `docker compose up -d --build --wait`, registrando la salida y el tiempo de ejecución.
  3. Se comprobó que los servicios estuvieran saludables.
  4. Se verificó la inicialización automática de los datos en PostgreSQL.
  5. Se ejecutó el verificador principal sobre la instalación nueva.
  6. En una ejecución anterior, se reiniciaron los contenedores y se ejecutó la fase `persistencia`.

- **Resultados:**
  - Tiempo de despliegue: **1 minuto y 5,627 segundos**.
  - Límite de aceptación: **10 minutos**.
  - Cinco servicios principales saludables.
  - Inicialización automática: **4 turnos y 148 inscripciones**.
  - Verificador principal después del despliegue limpio: **23/23 pruebas OK**.
  - Persistencia: **1/1 prueba OK**.
  - Se encontraron 251 inscripciones y se comprobaron **20/20 estados conservados** después del reinicio.

- **Evidencias:**
  - `verificacion/resultados/despliegue-limpio.txt`
  - `verificacion/resultados/semillas-despliegue.txt`
  - `verificacion/resultados/20261118-2218-persistencia.md`
  - `verificacion/resultados/20261118-2252-principal.md`

- **Conclusión:** el sistema pudo reconstruirse desde contenedores y volúmenes nuevos, inicializar sus datos y superar las pruebas automatizadas dentro del tiempo establecido.

- **Alcance:** Docker y las imágenes ya estaban disponibles en la computadora. No se midió la instalación inicial de Docker ni la descarga completa de imágenes sin caché. La prueba de persistencia comparó una muestra de 20 estados, no cada una de las 251 inscripciones.

### NFR-04 · Integridad y consistencia de datos (equidad en el último cupo)

- **Qué se verificó:** que nunca se asignen más cupos que los disponibles, que un chico no quede inscripto dos veces en la temporada y que se respete el orden de la lista de espera.

- **Cómo:** `verificar.py`:
  1. Prepara un turno con un solo cupo libre.
  2. Ejecuta 30 solicitudes concurrentes.
  3. Comprueba una inscripción confirmada y 29 en espera.
  4. Verifica posiciones consecutivas en la lista de espera.
  5. Ejecuta 10 solicitudes simultáneas del mismo chico.
  6. Cancela la inscripción confirmada y comprueba la promoción de la primera persona en espera.
  7. Comprueba la reinscripción del chico cancelado y restaura la distribución de cupos.

  También comprueba las respuestas ante inscripciones válidas, duplicados, residencia, edad y datos inválidos.

- **Resultados:**
  - 30 solicitudes concurrentes: **1 confirmada y 29 en espera**.
  - **0 sobrecupos**.
  - Latencia p95: **1200 ms**; máxima: **1233 ms**.
  - 10 solicitudes del mismo chico: **1 respuesta 201 y 9 respuestas 409**.
  - Cancelación y promoción de la primera inscripción en espera: correctas.
  - Rechazo de no residentes, edades fuera de rango y datos inválidos: correcto.

- **Evidencia:** `verificacion/resultados/20261118-2252-principal.md`.

- **Conclusión:** se mantuvo la integridad de los cupos y el orden de la lista de espera en los escenarios concurrentes probados.

### NFR-05 · Seguridad

- **Qué se verificó:** que la API controle la autenticación y autorización independientemente de las restricciones visuales de la SPA.

- **Cómo:** `verificar.py` inicia sesión mediante Authorization Code + PKCE (S256) con los usuarios `tutor1`, `admin1` y `sysadmin1`, y realiza llamadas directas a la API.

- **Resultados:**
  - Inicio de sesión mediante PKCE: **3 tokens obtenidos**.
  - Solicitud sin token: **401**.
  - Token con firma alterada: **401**.
  - Tutor accediendo al listado administrativo: **403**.
  - Administrativo accediendo a configuración de temporada: **403**.
  - Administrativo accediendo a gestión de cuentas: **403**.
  - Tutor consultando una inscripción ajena: **404**.
  - Administrador del sistema creando y deshabilitando una cuenta administrativa: correcto.
  - Intento de quitarse su propio rol de administrador del sistema: **409**.

- **Evidencia:** `verificacion/resultados/20261118-2252-principal.md`.

- **Conclusión:** se comprobaron controles de autenticación, autorización por roles y protección de recursos ajenos en los escenarios probados.

- **Alcance:** no se realizó una auditoría de penetración exhaustiva.

### NFR-06 · Disponibilidad

- **Qué se verificó:** que la caída del padrón externo no permita crear inscripciones sin validar y que las funcionalidades independientes continúen operativas.

- **Cómo:**
  1. Se utilizó el DNI de prueba `50000000` para simular un error del padrón.
  2. Se detuvo WireMock mediante `docker compose stop wiremock`.
  3. Se ejecutó `docker compose --profile verificacion run --rm verificador padron-apagado`.
  4. Se restauró WireMock.

- **Hipótesis:** la inscripción debe responder 503 con `Retry-After`, no crear una inscripción no validada, informar el problema en `/health` y permitir que el resto del sistema siga atendiendo.

- **Resultados:**
  - Error simulado: **503**, `Retry-After: 30`, sin inscripción creada, **78 ms**.
  - WireMock detenido: **503**, `Retry-After: 30`, **3007 ms**.
  - `/health`: **503**, `status: degraded`, `padron: error`.
  - Consulta de turnos: **200**.
  - Fase `padron-apagado`: **3/3 pruebas OK**.

  En una primera ejecución se obtuvo 1/3 pruebas correctas. Se comprobó posteriormente que WireMock estaba activo y se repitió la prueba con el contenedor efectivamente detenido, obteniendo 3/3 pruebas correctas.

- **Evidencias:**
  - `verificacion/resultados/20261118-2215-padron-apagado.md`
  - `verificacion/resultados/20261118-2252-principal.md`

- **Conclusión:** el sistema gestionó la indisponibilidad del padrón, rechazó la inscripción no validada y mantuvo operativa la consulta de turnos.

## Evidencias consolidadas

Todos los archivos se encuentran en `verificacion/resultados/`.

| Archivo | Verificación |
|---|---|
| `consumo-ram.txt` | NFR-02: consumo de memoria |
| `despliegue-limpio.txt` | NFR-03: despliegue cronometrado |
| `semillas-despliegue.txt` | NFR-03: inicialización automática |
| `20261118-2218-persistencia.md` | NFR-03: persistencia |
| `20261118-2252-principal.md` | NFR-01, NFR-04, NFR-05 y NFR-06 |
| `20261118-2215-padron-apagado.md` | NFR-06: caída real del padrón |
| `nfr01-antes.png` | NFR-01: configuración original (pendiente) |
| `nfr01-despues.png` | NFR-01: configuración modificada (pendiente) |

## Lo que no verificamos y por qué

- **Carga masiva sostenida:** el escenario contempla 1.500 familias en tres semanas, no miles de solicitudes por segundo. Se priorizó la integridad en el último cupo. Si el volumen aumentara, correspondería evaluar una cola de solicitudes y nuevas pruebas de carga.
- **HTTPS y MFA:** fuera del alcance del TP (ADR-006). En producción, TLS debería proporcionarlo el proxy municipal y MFA podría habilitarse en Keycloak.
- **Máquina sin Docker ni imágenes descargadas:** se verificó un despliegue limpio de la aplicación con contenedores y volúmenes nuevos, pero no la preparación completa de una computadora.
- **Auditoría económica completa:** se verificó el consumo de memoria, pero no se realizó una auditoría independiente de licencias y costos.
- **Persistencia individual de todas las inscripciones:** la prueba automatizada comparó los estados de 20 inscripciones después del reinicio.
