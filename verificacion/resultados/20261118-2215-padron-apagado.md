# Resultado de la verificación · padron-apagado

- Fecha: 18/11/2026 22:15
- Pruebas: 3 · OK: 3 · Fallas: 0
- Comando: `docker compose --profile verificacion run --rm verificador padron-apagado`

Previo: `docker compose stop wiremock`. Después: `docker compose start wiremock`.

| NFR | Prueba | Esperado | Obtenido | |
|---|---|---|---|---|
| NFR-06 Disponibilidad | Inscripción con el contenedor del padrón detenido | 503 + Retry-After en menos de 3,5 s (timeout de 3 s) | 503 /problemas/padron-no-disponible · Retry-After 30 · 3007 ms | ✅ |
| NFR-06 Disponibilidad | Health con el padrón detenido | 503 y padron: error | 503 {'status': 'degraded', 'api': 'ok', 'database': 'ok', 'keycloak': 'ok', 'padron': 'error'} | ✅ |
| NFR-06 Disponibilidad | El resto del sistema sigue atendiendo (GET /turnos) | 200 | 200 | ✅ |
