"""Gestión de cuentas del personal: reglas del servicio y endpoints, con Keycloak simulado.

Keycloak se reemplaza por un httpx.MockTransport que imita las rutas de su API de administración,
así se prueba también la capa anticorrupción (app/integrations/keycloak_admin.py) sin levantar nada.
"""
import json
import os
import re
import uuid

import httpx
import pytest

os.environ.setdefault("AUTH_ENABLED", "false")  # usuario de desarrollo con todos los roles

from app.core.errors import CambioNoPermitido, IdentidadNoDisponible, UsuarioDuplicado, UsuarioInexistente
from app.integrations.keycloak_admin import KeycloakAdminClient
from app.modules.usuarios.schemas import UsuarioCambios, UsuarioNuevo
from app.modules.usuarios.service import UsuarioService


class KeycloakFalso:
    """Estado en memoria y las rutas de la API de administración que usa la app."""

    def __init__(self):
        self.usuarios: dict[str, dict] = {}
        self.roles: dict[str, set[str]] = {}
        self.caido = False

    def alta(self, username, rol, enabled=True, uid=None):
        uid = uid or str(uuid.uuid4())
        self.usuarios[uid] = {"id": uid, "username": username, "firstName": "N", "lastName": username,
                              "email": f"{username}@example.com", "enabled": enabled}
        self.roles[uid] = {rol}
        return uid

    def __call__(self, req: httpx.Request) -> httpx.Response:
        if self.caido:
            raise httpx.ConnectError("keycloak caído", request=req)
        ruta, m = req.url.path, req.method
        cuerpo = json.loads(req.content) if req.content and req.headers.get("content-type", "").startswith("application/json") else None
        if ruta.endswith("/protocol/openid-connect/token"):
            return httpx.Response(200, json={"access_token": "t", "expires_in": 300})
        assert req.headers["Authorization"] == "Bearer t"
        base = "/admin/realms/colonia"
        if mt := re.fullmatch(base + r"/roles/(\w+)/users", ruta):
            return httpx.Response(200, json=[u for i, u in self.usuarios.items() if mt[1] in self.roles[i]])
        if mt := re.fullmatch(base + r"/roles/(\w+)", ruta):
            return httpx.Response(200, json={"id": "r-" + mt[1], "name": mt[1]})
        if ruta == base + "/users" and m == "POST":
            if any(u["username"] == cuerpo["username"] for u in self.usuarios.values()):
                return httpx.Response(409, json={"errorMessage": "User exists"})
            uid = str(uuid.uuid4())
            self.usuarios[uid] = {"id": uid, **{k: cuerpo[k] for k in ("username", "firstName", "lastName", "email", "enabled")}}
            self.roles[uid] = set()
            return httpx.Response(201, headers={"Location": f"http://keycloak:8080{base}/users/{uid}"})
        if mt := re.fullmatch(base + r"/users/([\w-]+)/role-mappings/realm", ruta):
            if mt[1] not in self.usuarios:
                return httpx.Response(404)
            if m == "GET":
                return httpx.Response(200, json=[{"name": r} for r in self.roles[mt[1]]])
            nombres = {r["name"] for r in cuerpo}
            self.roles[mt[1]] = self.roles[mt[1]] | nombres if m == "POST" else self.roles[mt[1]] - nombres
            return httpx.Response(204)
        if mt := re.fullmatch(base + r"/users/([\w-]+)", ruta):
            if mt[1] not in self.usuarios:
                return httpx.Response(404)
            if m == "GET":
                return httpx.Response(200, json=self.usuarios[mt[1]])
            if m == "PUT":
                self.usuarios[mt[1]].update(cuerpo)
                return httpx.Response(204)
            if m == "DELETE":
                del self.usuarios[mt[1]], self.roles[mt[1]]
                return httpx.Response(204)
        return httpx.Response(500)


@pytest.fixture
def kc():
    falso = KeycloakFalso()
    falso.yo = falso.alta("sysadmin1", "administrador_sistema")
    falso.admin1 = falso.alta("admin1", "administrativo")
    falso.alta("tutor1", "tutor")
    return falso


@pytest.fixture
def svc(kc):
    return UsuarioService(KeycloakAdminClient(transport=httpx.MockTransport(kc)))


def cambios(**k):
    base = dict(nombre="Ana", apellido="Sosa", email="ana@example.com", rol="administrativo", habilitado=True)
    return UsuarioCambios(**{**base, **k})


def test_lista_solo_al_personal(svc):
    assert sorted(u.usuario for u in svc.listar()) == ["admin1", "sysadmin1"]


def test_alta_crea_la_cuenta_con_su_rol(svc, kc):
    u = svc.crear(UsuarioNuevo(usuario="Ana.Sosa", nombre="Ana", apellido="Sosa", email="ana@example.com",
                               rol="administrativo", clave_temporal="Temporal123!"))
    assert (u.usuario, u.rol, u.habilitado) == ("ana.sosa", "administrativo", True)
    assert kc.roles[u.id] == {"administrativo"}


def test_alta_duplicada_da_409(svc):
    with pytest.raises(UsuarioDuplicado):
        svc.crear(UsuarioNuevo(usuario="admin1", nombre="Otro", apellido="Admin", email="otro@example.com",
                               rol="administrativo", clave_temporal="Temporal123!"))


def test_baja_deshabilita_sin_borrar(svc, kc):
    u = svc.modificar(kc.admin1, cambios(habilitado=False), quien=kc.yo)
    assert u.habilitado is False and kc.admin1 in kc.usuarios


def test_cambio_de_rol_reemplaza_el_anterior(svc, kc):
    u = svc.modificar(kc.admin1, cambios(rol="administrador_sistema"), quien=kc.yo)
    assert u.rol == "administrador_sistema" and kc.roles[kc.admin1] == {"administrador_sistema"}


def test_no_se_puede_deshabilitar_a_si_mismo(svc, kc):
    with pytest.raises(CambioNoPermitido):
        svc.modificar(kc.yo, cambios(rol="administrador_sistema", habilitado=False), quien=kc.yo)


def test_no_se_puede_quitar_el_ultimo_administrador(svc, kc):
    with pytest.raises(CambioNoPermitido):
        svc.modificar(kc.yo, cambios(rol="administrativo"), quien="otro-administrador")


def test_los_tutores_no_se_gestionan(svc, kc):
    tutor = next(i for i, r in kc.roles.items() if r == {"tutor"})
    with pytest.raises(UsuarioInexistente):
        svc.modificar(tutor, cambios(), quien=kc.yo)


def test_keycloak_caido_da_503(svc, kc):
    kc.caido = True
    with pytest.raises(IdentidadNoDisponible):
        svc.listar()


def test_endpoints_y_problem_details(kc, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.modules.usuarios import routes

    monkeypatch.setattr(routes.service, "keycloak", KeycloakAdminClient(transport=httpx.MockTransport(kc)))
    cliente = TestClient(app)

    r = cliente.post("/api/v1/admin/usuarios", json={"usuario": "lucia", "nombre": "Lucía", "apellido": "Paz",
                                                    "email": "lucia@example.com", "rol": "administrativo",
                                                    "clave_temporal": "Temporal123!"})
    assert r.status_code == 201 and r.headers["Location"].endswith(r.json()["id"])

    r = cliente.post("/api/v1/admin/usuarios", json={"usuario": "x", "rol": "tutor"})
    assert r.status_code == 422 and r.headers["Content-Type"].startswith("application/problem+json")

    r = cliente.put(f"/api/v1/admin/usuarios/{kc.yo}", json={"nombre": "Ana", "apellido": "Sosa", "email": "a@example.com",
                                                            "rol": "administrativo", "habilitado": True})
    assert r.status_code == 409 and r.json()["type"] == "/problemas/cambio-no-permitido"

    assert len(cliente.get("/api/v1/admin/usuarios").json()) == 3
