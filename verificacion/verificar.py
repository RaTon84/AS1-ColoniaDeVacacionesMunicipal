"""Verificación de los NFRs del TP 6A contra el sistema levantado con Docker Compose.

Corre dentro de un contenedor que comparte la red de Keycloak (ver el servicio `verificador` del
docker-compose.yml), así que no hace falta instalar nada en la máquina:

    docker compose --profile verificacion run --rm verificador                 # pruebas principales
    docker compose --profile verificacion run --rm verificador padron-apagado  # con wiremock detenido
    docker compose --profile verificacion run --rm verificador persistencia    # después de reiniciar

Solo usa la biblioteca estándar. Inicia sesión como lo hace la SPA (Authorization Code + PKCE contra
Keycloak), así que no necesita ningún cliente ni permiso especial en el realm.
Cada corrida deja su resultado en verificacion/resultados/ como evidencia.
"""
import ast
import base64
import concurrent.futures as cf
import hashlib
import html
import http.cookiejar
import json
import os
import pathlib
import re
import secrets
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

APP = os.environ.get("APP_URL", "http://app:8000")
KC = os.environ.get("KEYCLOAK_URL", "http://localhost:8080")  # localhost = red compartida con Keycloak
REALM = "colonia"
CLIENTE = "colonia-spa"
REDIRECT = "http://localhost:8000/"
SALIDA = pathlib.Path(os.environ.get("RESULTADOS", "/verificacion/resultados"))
BACKEND = pathlib.Path(os.environ.get("BACKEND_DIR", "/backend"))
USUARIOS = {"tutor": ("tutor1", "Tutor123!"), "admin": ("admin1", "Admin123!"),
            "sysadmin": ("sysadmin1", "SysAdmin123!")}
DNI_RESIDENTE, DNI_NO_RESIDENTE, DNI_PADRON_CAIDO = "30111222", "12345678", "50000000"
CONCURRENTES = int(os.environ.get("CONCURRENTES", "30"))

resultados = []
corrida = datetime.now().strftime("%H%M%S")
_contador = 0
_lock = threading.Lock()


# ----------------------------------------------------------------------------- utilidades HTTP
class _SinRedirecciones(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def llamar(metodo, ruta, token=None, cuerpo=None, base=APP, timeout=20):
    """Devuelve (status, encabezados, cuerpo_json_o_texto, milisegundos)."""
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    pedido = urllib.request.Request(base + ruta, data=datos, method=metodo)
    if datos is not None:
        pedido.add_header("Content-Type", "application/json")
    if token:
        pedido.add_header("Authorization", f"Bearer {token}")
    inicio = time.perf_counter()
    try:
        with urllib.request.urlopen(pedido, timeout=timeout) as r:
            status, encabezados, crudo = r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        status, encabezados, crudo = e.code, dict(e.headers), e.read()
    ms = (time.perf_counter() - inicio) * 1000
    try:
        contenido = json.loads(crudo) if crudo else None
    except ValueError:
        contenido = crudo.decode(errors="replace")
    return status, encabezados, contenido, ms


def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def login(rol):
    """Authorization Code + PKCE (S256), como la SPA: formulario de Keycloak, código y canje por token."""
    usuario, clave = USUARIOS[rol]
    navegador = urllib.request.build_opener(
        # Keycloak marca sus cookies como Secure; un navegador igual las envía a http://localhost.
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar(
            http.cookiejar.DefaultCookiePolicy(secure_protocols=("https", "wss", "http")))),
        _SinRedirecciones)
    verificador = _b64(secrets.token_bytes(32))
    desafio = _b64(hashlib.sha256(verificador.encode()).digest())
    consulta = urllib.parse.urlencode({
        "client_id": CLIENTE, "response_type": "code", "scope": "openid", "redirect_uri": REDIRECT,
        "code_challenge": desafio, "code_challenge_method": "S256", "state": secrets.token_hex(8)})
    oidc = f"{KC}/realms/{REALM}/protocol/openid-connect"
    pagina = navegador.open(f"{oidc}/auth?{consulta}", timeout=20).read().decode()
    accion = re.search(r'action="([^"]*login-actions/authenticate[^"]*)"', pagina)
    if not accion:
        raise RuntimeError("No se encontró el formulario de login de Keycloak")
    try:
        navegador.open(html.unescape(accion.group(1)), timeout=20,
                       data=urllib.parse.urlencode({"username": usuario, "password": clave}).encode())
        raise RuntimeError(f"Keycloak no aceptó el login de {usuario}")
    except urllib.error.HTTPError as e:
        destino = e.headers.get("Location", "")
    codigo = urllib.parse.parse_qs(urllib.parse.urlparse(destino).query).get("code", [None])[0]
    if not codigo:
        raise RuntimeError(f"Keycloak no devolvió un código para {usuario}: {destino}")
    canje = urllib.parse.urlencode({
        "grant_type": "authorization_code", "code": codigo, "redirect_uri": REDIRECT,
        "client_id": CLIENTE, "code_verifier": verificador}).encode()
    with urllib.request.urlopen(f"{oidc}/token", data=canje, timeout=20) as r:
        return json.loads(r.read())["access_token"]


# ----------------------------------------------------------------------------- registro de resultados
def registrar(nfr, prueba, esperado, obtenido, ok):
    resultados.append({"nfr": nfr, "prueba": prueba, "esperado": esperado, "obtenido": obtenido, "ok": bool(ok)})
    print(f"  [{'OK ' if ok else 'FALLA'}] {nfr} · {prueba}: {obtenido}", flush=True)


def tipo(contenido):
    return contenido.get("type") if isinstance(contenido, dict) else None


def p95(valores):
    v = sorted(valores)
    return v[max(0, int(round(0.95 * len(v))) - 1)] if v else 0


def dni_chico():
    global _contador
    with _lock:
        _contador += 1
        return f"9{corrida}{_contador:03d}"


def inscripcion(turno_id, nacimiento, dni_tutor=DNI_RESIDENTE, dni=None, email="familia@example.com"):
    return {"turno_id": turno_id, "dni_chico": dni or dni_chico(), "nombre_chico": "Prueba",
            "apellido_chico": "Verificacion", "fecha_nacimiento": nacimiento, "dni_tutor": dni_tutor,
            "nombre_tutor": "Tutor", "apellido_tutor": "Prueba", "email_tutor": email,
            "telefono_tutor": "1144445555"}


def en_paralelo(funcion, cantidad):
    """Lanza `cantidad` llamadas que arrancan juntas (barrera) y devuelve sus resultados."""
    barrera = threading.Barrier(cantidad)

    def tarea(i):
        barrera.wait()
        return funcion(i)

    with cf.ThreadPoolExecutor(max_workers=cantidad) as ex:
        return list(ex.map(tarea, range(cantidad)))


def esperar_sistema(segundos=180):
    limite = time.time() + segundos
    while time.time() < limite:
        try:
            status, _, cuerpo, _ = llamar("GET", "/api/v1/health", timeout=5)
            if status == 200:
                return cuerpo
        except OSError:
            pass
        time.sleep(3)
    raise RuntimeError("La aplicación no respondió /api/v1/health a tiempo")


def guardar(fase, notas=""):
    SALIDA.mkdir(parents=True, exist_ok=True)
    ahora = datetime.now()
    archivo = SALIDA / f"{ahora:%Y%m%d-%H%M}-{fase}.md"
    ok = sum(r["ok"] for r in resultados)
    lineas = [f"# Resultado de la verificación · {fase}", "",
              f"- Fecha: {ahora:%d/%m/%Y %H:%M}", f"- Pruebas: {len(resultados)} · OK: {ok} · Fallas: {len(resultados) - ok}",
              "- Comando: `docker compose --profile verificacion run --rm verificador"
              + ("" if fase == "principal" else f" {fase}") + "`",
              ""]
    if notas:
        lineas += [notas, ""]
    lineas += ["| NFR | Prueba | Esperado | Obtenido | |", "|---|---|---|---|---|"]
    for r in resultados:
        lineas.append(f"| {r['nfr']} | {r['prueba']} | {r['esperado']} | {r['obtenido']} | {'✅' if r['ok'] else '❌'} |")
    archivo.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(f"\n{ok}/{len(resultados)} pruebas OK. Resultado guardado en verificacion/resultados/{archivo.name}")
    return ok == len(resultados)


# ----------------------------------------------------------------------------- pruebas
def fitness_arquitectura():
    """NFR-01: las reglas (service.py) y los repositorios no dependen del framework web."""
    prohibidos = {"fastapi", "starlette"}
    archivos = sorted(BACKEND.glob("app/modules/*/service.py")) + sorted(BACKEND.glob("app/modules/*/repository.py"))
    violaciones = []
    for f in archivos:
        arbol = ast.parse(f.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            nombres = [a.name for a in nodo.names] if isinstance(nodo, ast.Import) else \
                [nodo.module or ""] if isinstance(nodo, ast.ImportFrom) else []
            violaciones += [f"{f.relative_to(BACKEND)} importa {n}" for n in nombres if n.split(".")[0] in prohibidos]
    registrar("NFR-01 Mantenibilidad", f"Ningún service.py ni repository.py importa FastAPI ({len(archivos)} archivos)",
              "0 violaciones", f"{len(violaciones)} violaciones" + (f": {violaciones}" if violaciones else ""),
              archivos and not violaciones)


def principal():
    print("Esperando a que el sistema esté sano...", flush=True)
    salud = esperar_sistema()
    registrar("NFR-06 Disponibilidad", "GET /api/v1/health con todo levantado", "200, todos los componentes ok",
              f"200 {salud}", all(v == "ok" for k, v in salud.items() if k != "status"))

    fitness_arquitectura()

    # --- Seguridad
    t = {}
    for rol in USUARIOS:
        t[rol] = login(rol)
    registrar("NFR-05 Seguridad", "Login Authorization Code + PKCE (S256) de los 3 usuarios de prueba",
              "3 tokens emitidos por Keycloak", f"{len(t)} tokens", len(t) == 3)

    s, h, c, _ = llamar("GET", "/api/v1/turnos")
    registrar("NFR-05 Seguridad", "GET /turnos sin token", "401 + WWW-Authenticate: Bearer + problem+json",
              f"{s} · {h.get('WWW-Authenticate')} · {h.get('Content-Type')}",
              s == 401 and "Bearer" in (h.get("WWW-Authenticate") or "") and "problem+json" in (h.get("Content-Type") or ""))

    cabeza, carga, firma = t["tutor"].split(".")
    alterado = f"{cabeza}.{carga}.{firma[:-4]}{'AAAA' if not firma.endswith('AAAA') else 'BBBB'}"
    s, _, _, _ = llamar("GET", "/api/v1/turnos", alterado)
    registrar("NFR-05 Seguridad", "Token con la firma alterada", "401", str(s), s == 401)

    s, _, _, _ = llamar("GET", "/api/v1/admin/inscripciones", t["tutor"])
    registrar("NFR-05 Seguridad", "Tutor pide el listado administrativo", "403", str(s), s == 403)
    s, _, _, _ = llamar("GET", "/api/v1/admin/inscripciones", t["admin"])
    registrar("NFR-05 Seguridad", "Administrativo pide el listado administrativo", "200", str(s), s == 200)

    s, _, conf, _ = llamar("GET", "/api/v1/admin/configuracion-temporada", t["sysadmin"])
    s2, _, _, _ = llamar("GET", "/api/v1/admin/configuracion-temporada", t["admin"])
    registrar("NFR-05 Seguridad", "Configuración de temporada: administrador del sistema / administrativo",
              "200 / 403", f"{s} / {s2}", s == 200 and s2 == 403)
    temporada = conf["temporada"]
    edad = (conf["edad_minima"] + conf["edad_maxima"]) // 2
    nacimiento_ok = f"{temporada - edad - 1}-06-15"
    nacimiento_chico_chico = f"{temporada - conf['edad_minima'] + 1}-06-15"

    _, _, turnos, _ = llamar("GET", "/api/v1/turnos", t["tutor"])
    turno = turnos[0]

    # --- Reglas de negocio e integridad
    cuerpo = inscripcion(turno["id"], nacimiento_ok)
    s, h, c, ms = llamar("POST", "/api/v1/inscripciones", t["tutor"], cuerpo)
    registrar("NFR-04 Integridad", "Inscripción válida (residente, edad en rango)", "201 + Location",
              f"{s} · Location {h.get('Location')} · {ms:.0f} ms", s == 201 and h.get("Location"))
    propia = c["id"] if s == 201 else None

    s, _, c, _ = llamar("POST", "/api/v1/inscripciones", t["tutor"], cuerpo)
    registrar("NFR-04 Integridad", "El mismo chico otra vez en la temporada", "409 inscripcion-duplicada",
              f"{s} {tipo(c)}", s == 409 and tipo(c) == "/problemas/inscripcion-duplicada")

    s, _, c, _ = llamar("POST", "/api/v1/inscripciones", t["tutor"], inscripcion(turno["id"], nacimiento_ok, DNI_NO_RESIDENTE))
    registrar("NFR-04 Integridad", "Tutor que no figura en el padrón", "422 no-residente",
              f"{s} {tipo(c)}", s == 422 and tipo(c) == "/problemas/no-residente")

    s, _, c, _ = llamar("POST", "/api/v1/inscripciones", t["tutor"], inscripcion(turno["id"], nacimiento_chico_chico))
    registrar("NFR-04 Integridad", f"Chico menor de {conf['edad_minima']} años", "422 edad-fuera-de-rango",
              f"{s} {tipo(c)}", s == 422 and tipo(c) == "/problemas/edad-fuera-de-rango")

    s, _, c, _ = llamar("POST", "/api/v1/inscripciones", t["tutor"], inscripcion(turno["id"], nacimiento_ok, email="no-es-un-mail"))
    registrar("NFR-04 Integridad", "Datos inválidos (email mal formado)", "422 datos-invalidos",
              f"{s} {tipo(c)}", s == 422 and tipo(c) == "/problemas/datos-invalidos")

    _, _, ajena, _ = llamar("POST", "/api/v1/inscripciones", t["admin"], inscripcion(turno["id"], nacimiento_ok))
    s, _, _, _ = llamar("GET", f"/api/v1/inscripciones/{ajena['id']}", t["tutor"])
    registrar("NFR-05 Seguridad", "Tutor pide una inscripción cargada por otra persona", "404 (no revela que existe)",
              str(s), s == 404)

    # --- Concurrencia: el último cupo
    _, _, turnos, _ = llamar("GET", "/api/v1/turnos", t["sysadmin"])
    original = {x["id"]: x["cupo_total"] for x in turnos}
    turno = next(x for x in turnos if x["id"] == turno["id"])
    confirmadas = turno["cupo_total"] - turno["cupos_disponibles"]
    distribucion = {"temporada": temporada,
                    "turnos": [{"turno_id": i, "cupo_total": (confirmadas + 1 if i == turno["id"] else c)}
                               for i, c in original.items()]}
    s, _, _, _ = llamar("PUT", "/api/v1/admin/distribucion-cupos", t["sysadmin"], distribucion)
    if s != 200:
        registrar("NFR-04 Integridad", "Preparar el turno con 1 solo cupo libre", "200", str(s), False)
        return guardar("principal")

    _, _, espera_antes, _ = llamar("GET", "/api/v1/admin/inscripciones", t["admin"])
    en_espera_antes = sum(1 for x in espera_antes if x["turno_id"] == turno["id"] and x["estado"] == "LISTA_ESPERA")

    tokens = [t["tutor"], t["admin"]]  # familias desde su casa y administrativos en la oficina, a la vez
    respuestas = en_paralelo(lambda i: llamar("POST", "/api/v1/inscripciones", tokens[i % 2],
                                               inscripcion(turno["id"], nacimiento_ok)), CONCURRENTES)
    creadas = [c for s, _, c, _ in respuestas if s == 201]
    conf_nuevas = [c for c in creadas if c["estado"] == "CONFIRMADA"]
    espera_nuevas = sorted(c["posicion_espera"] for c in creadas if c["estado"] == "LISTA_ESPERA")
    _, _, turnos_desp, _ = llamar("GET", "/api/v1/turnos", t["tutor"])
    disponibles = next(x for x in turnos_desp if x["id"] == turno["id"])["cupos_disponibles"]
    tiempos = [ms for *_, ms in respuestas]
    ok = (len(creadas) == CONCURRENTES and len(conf_nuevas) == 1 and disponibles == 0
          and espera_nuevas == list(range(en_espera_antes + 1, en_espera_antes + CONCURRENTES)))
    registrar("NFR-04 Integridad", f"{CONCURRENTES} pedidos simultáneos por el último cupo",
              f"1 confirmada, {CONCURRENTES - 1} en lista de espera con posiciones consecutivas, 0 cupos libres",
              f"{len(conf_nuevas)} confirmada · {len(espera_nuevas)} en espera (pos. {espera_nuevas[:1]}…{espera_nuevas[-1:]}) · "
              f"{disponibles} libres · p95 {p95(tiempos):.0f} ms, máx {max(tiempos):.0f} ms", ok)

    mismo = inscripcion(turno["id"], nacimiento_ok)
    respuestas = en_paralelo(lambda i: llamar("POST", "/api/v1/inscripciones", t["tutor"], mismo), 10)
    codigos = sorted(s for s, *_ in respuestas)
    registrar("NFR-04 Integridad", "10 pedidos simultáneos del mismo chico", "1 × 201 y 9 × 409",
              f"{codigos.count(201)} × 201 y {codigos.count(409)} × 409",
              codigos.count(201) == 1 and codigos.count(409) == 9)

    # --- Cancelar con promoción y reinscripción
    ganadora = conf_nuevas[0] if conf_nuevas else None
    _, _, todas, _ = llamar("GET", "/api/v1/admin/inscripciones", t["admin"])
    primera_espera = min((x for x in todas if x["turno_id"] == turno["id"] and x["estado"] == "LISTA_ESPERA"),
                         key=lambda x: x["posicion_espera"], default=None)
    if ganadora and primera_espera:
        s, _, c, _ = llamar("POST", f"/api/v1/inscripciones/{ganadora['id']}/cancelar", t["admin"])
        _, _, promovida, _ = llamar("GET", f"/api/v1/inscripciones/{primera_espera['id']}", t["admin"])
        estado_c = c.get("estado") if isinstance(c, dict) else None
        estado_p = promovida.get("estado") if isinstance(promovida, dict) else None
        registrar("NFR-04 Integridad", "Cancelar la confirmada promueve a la primera de la lista de espera",
                  "CANCELADA y la primera en espera pasa a CONFIRMADA",
                  f"{s} {estado_c} · la que estaba 1.ª en espera quedó {estado_p}",
                  s == 200 and estado_c == "CANCELADA" and estado_p == "CONFIRMADA")
        cuerpo_re = {k: ganadora[k] for k in ("turno_id", "dni_chico", "nombre_chico", "apellido_chico",
                                               "fecha_nacimiento", "dni_tutor", "nombre_tutor", "apellido_tutor",
                                               "email_tutor", "telefono_tutor")}
        s, _, c, _ = llamar("POST", "/api/v1/inscripciones", t["admin"], cuerpo_re)
        registrar("NFR-04 Integridad", "Reinscribir al chico cancelado", "201 (con el turno lleno, a lista de espera)",
                  f"{s} {c.get('estado') if isinstance(c, dict) else ''}", s == 201)
    else:
        registrar("NFR-04 Integridad", "Cancelar con promoción", "una confirmada y una en espera", "no hubo datos para probarlo", False)

    # --- Volver a la distribución original: ampliar el cupo promueve en orden de llegada
    distribucion["turnos"] = [{"turno_id": i, "cupo_total": c} for i, c in original.items()]
    s, _, _, _ = llamar("PUT", "/api/v1/admin/distribucion-cupos", t["sysadmin"], distribucion)
    registrar("NFR-04 Integridad", "Restaurar la distribución de cupos original", "200", str(s), s == 200)

    # --- Padrón con falla
    chico = inscripcion(turno["id"], nacimiento_ok, DNI_PADRON_CAIDO)
    s, h, c, ms = llamar("POST", "/api/v1/inscripciones", t["tutor"], chico)
    _, _, todas, _ = llamar("GET", "/api/v1/admin/inscripciones", t["admin"])
    creada = any(x["dni_chico"] == chico["dni_chico"] for x in todas)
    registrar("NFR-06 Disponibilidad", "El padrón responde con error (DNI 50000000)",
              "503 padron-no-disponible + Retry-After, sin inscripción creada",
              f"{s} {tipo(c)} · Retry-After {h.get('Retry-After')} · creada: {'sí' if creada else 'no'} · {ms:.0f} ms",
              s == 503 and tipo(c) == "/problemas/padron-no-disponible" and h.get("Retry-After") and not creada)

    # --- Estado para la prueba de persistencia
    if propia:
        SALIDA.mkdir(parents=True, exist_ok=True)
        _, _, actuales, _ = llamar("GET", "/api/v1/admin/inscripciones", t["admin"])
        (SALIDA / "estado.json").write_text(json.dumps(
            {"total": len(actuales), "muestra": {str(x["id"]): x["estado"] for x in actuales[-20:]}}, indent=1))
    return guardar("principal")


def padron_apagado():
    t = login("tutor")
    sys_t = login("sysadmin")
    _, _, conf, _ = llamar("GET", "/api/v1/admin/configuracion-temporada", sys_t)
    _, _, turnos, _ = llamar("GET", "/api/v1/turnos", t)
    edad = (conf["edad_minima"] + conf["edad_maxima"]) // 2
    s, h, c, ms = llamar("POST", "/api/v1/inscripciones", t,
                         inscripcion(turnos[0]["id"], f"{conf['temporada'] - edad - 1}-06-15"))
    registrar("NFR-06 Disponibilidad", "Inscripción con el contenedor del padrón detenido",
              "503 + Retry-After en menos de 3,5 s (timeout de 3 s)",
              f"{s} {tipo(c)} · Retry-After {h.get('Retry-After')} · {ms:.0f} ms",
              s == 503 and h.get("Retry-After") and ms < 3500)
    s, _, c, _ = llamar("GET", "/api/v1/health")
    registrar("NFR-06 Disponibilidad", "Health con el padrón detenido", "503 y padron: error",
              f"{s} {c}", s == 503 and isinstance(c, dict) and c.get("padron") == "error")
    s, _, c, _ = llamar("GET", "/api/v1/turnos", t)
    registrar("NFR-06 Disponibilidad", "El resto del sistema sigue atendiendo (GET /turnos)", "200", str(s), s == 200)
    return guardar("padron-apagado", "Previo: `docker compose stop wiremock`. Después: `docker compose start wiremock`.")


def persistencia():
    esperar_sistema()
    archivo = SALIDA / "estado.json"
    if not archivo.exists():
        registrar("NFR-03 Recuperación", "Datos de la corrida principal", "estado.json", "no existe: correr antes la verificación principal", False)
        return guardar("persistencia")
    antes = json.loads(archivo.read_text())
    admin = login("admin")
    _, _, actuales, _ = llamar("GET", "/api/v1/admin/inscripciones", admin)
    por_id = {str(x["id"]): x["estado"] for x in actuales}
    iguales = sum(1 for i, e in antes["muestra"].items() if por_id.get(i) == e)
    registrar("NFR-03 Recuperación", "Inscripciones después de reiniciar los contenedores",
              f"{antes['total']} inscripciones y la muestra con el mismo estado",
              f"{len(actuales)} inscripciones · {iguales}/{len(antes['muestra'])} con el mismo estado",
              len(actuales) >= antes["total"] and iguales == len(antes["muestra"]))
    return guardar("persistencia", "Previo: `docker compose restart` (o `docker compose down` y `up -d`, sin `-v`).")


if __name__ == "__main__":
    fase = sys.argv[1] if len(sys.argv) > 1 else "principal"
    fases = {"principal": principal, "padron-apagado": padron_apagado, "persistencia": persistencia}
    if fase not in fases:
        sys.exit(f"Fase desconocida: {fase}. Opciones: {', '.join(fases)}")
    print(f"Verificación · fase {fase} · app {APP} · keycloak {KC}\n", flush=True)
    sys.exit(0 if fases[fase]() else 1)
