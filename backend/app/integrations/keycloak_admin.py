"""Cliente de la API de administración de Keycloak (capa anticorrupción).

La app no guarda usuarios: las cuentas viven en Keycloak (ADR-005). Para que el administrador del
sistema gestione al personal desde el panel, la app usa un cliente de servicio propio
(`colonia-admin-api`, flujo client credentials) con los permisos mínimos para ver y gestionar
usuarios del realm. Este archivo traduce la API de Keycloak a operaciones simples y sus errores a
errores del dominio; nada de Keycloak sale de acá.
"""
import time

import httpx

from app.core.config import get_settings
from app.core.errors import IdentidadNoDisponible, UsuarioDuplicado, UsuarioInexistente


class KeycloakAdminClient:
    def __init__(self, transport: httpx.BaseTransport | None = None):
        settings = get_settings()
        self.realm_url = settings.keycloak_internal_url  # http://keycloak:8080/realms/colonia
        base, realm = settings.keycloak_internal_url.rsplit("/realms/", 1)
        self.admin_url = f"{base}/admin/realms/{realm}"
        self.client_id = settings.keycloak_admin_client_id
        self.client_secret = settings.keycloak_admin_client_secret
        self.transport = transport
        self._token: str | None = None
        self._vence = 0.0

    # ------------------------------------------------------------------ HTTP
    def _http(self) -> httpx.Client:
        return httpx.Client(timeout=5.0, transport=self.transport)

    def _token_de_servicio(self) -> str:
        if self._token and time.monotonic() < self._vence - 30:
            return self._token
        try:
            with self._http() as http:
                r = http.post(f"{self.realm_url}/protocol/openid-connect/token", data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                })
        except httpx.RequestError as exc:
            raise IdentidadNoDisponible("No se pudo contactar a Keycloak. Reintente más tarde.") from exc
        if r.status_code != 200:
            raise IdentidadNoDisponible("Keycloak rechazó las credenciales del cliente de servicio.")
        datos = r.json()
        self._token = datos["access_token"]
        self._vence = time.monotonic() + int(datos.get("expires_in", 60))
        return self._token

    def _pedir(self, metodo: str, ruta: str, **kwargs) -> httpx.Response:
        headers = {"Authorization": f"Bearer {self._token_de_servicio()}"}
        try:
            with self._http() as http:
                r = http.request(metodo, f"{self.admin_url}{ruta}", headers=headers, **kwargs)
        except httpx.RequestError as exc:
            raise IdentidadNoDisponible("No se pudo contactar a Keycloak. Reintente más tarde.") from exc
        if r.status_code == 404:
            raise UsuarioInexistente("No existe el usuario indicado.")
        if r.status_code == 409:
            raise UsuarioDuplicado("Ya existe una cuenta con ese usuario o ese correo.")
        if r.status_code >= 400:
            raise IdentidadNoDisponible(f"Keycloak respondió {r.status_code} al gestionar usuarios.")
        return r

    # ------------------------------------------------------------------ operaciones
    def usuarios_con_rol(self, rol: str) -> list[dict]:
        return self._pedir("GET", f"/roles/{rol}/users", params={"first": 0, "max": 500}).json()

    def obtener(self, usuario_id: str) -> dict:
        return self._pedir("GET", f"/users/{usuario_id}").json()

    def roles_de(self, usuario_id: str) -> set[str]:
        return {r["name"] for r in self._pedir("GET", f"/users/{usuario_id}/role-mappings/realm").json()}

    def crear(self, usuario: str, nombre: str, apellido: str, email: str, clave_temporal: str) -> str:
        r = self._pedir("POST", "/users", json={
            "username": usuario, "firstName": nombre, "lastName": apellido, "email": email,
            "enabled": True, "emailVerified": True,
            "credentials": [{"type": "password", "value": clave_temporal, "temporary": True}],
        })
        return r.headers["Location"].rstrip("/").rsplit("/", 1)[-1]

    def actualizar(self, usuario_id: str, nombre: str, apellido: str, email: str, habilitado: bool) -> None:
        self._pedir("PUT", f"/users/{usuario_id}", json={
            "firstName": nombre, "lastName": apellido, "email": email, "enabled": habilitado})

    def _rol(self, rol: str) -> dict:
        return self._pedir("GET", f"/roles/{rol}").json()

    def asignar_rol(self, usuario_id: str, rol: str) -> None:
        self._pedir("POST", f"/users/{usuario_id}/role-mappings/realm", json=[self._rol(rol)])

    def quitar_rol(self, usuario_id: str, rol: str) -> None:
        self._pedir("DELETE", f"/users/{usuario_id}/role-mappings/realm", json=[self._rol(rol)])

    def eliminar(self, usuario_id: str) -> None:
        self._pedir("DELETE", f"/users/{usuario_id}")
