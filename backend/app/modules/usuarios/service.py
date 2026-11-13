"""Gestión de las cuentas del personal municipal (administrativos y administradores del sistema).

Las cuentas viven en Keycloak; acá solo están las reglas:
- solo se gestionan los roles del personal (administrativo y administrador_sistema), uno por cuenta;
- la baja deshabilita la cuenta, no la borra (es reversible y se conserva quién cargó cada inscripción);
- nadie puede deshabilitarse ni quitarse el rol de administrador del sistema a sí mismo;
- siempre tiene que quedar al menos un administrador del sistema habilitado.
"""
from app.core.errors import CambioNoPermitido, UsuarioInexistente
from app.integrations.keycloak_admin import KeycloakAdminClient
from app.modules.usuarios.schemas import UsuarioCambios, UsuarioNuevo, UsuarioOut

ROLES_PERSONAL = ("administrativo", "administrador_sistema")
ADMIN = "administrador_sistema"


class UsuarioService:
    def __init__(self, keycloak: KeycloakAdminClient | None = None):
        self.keycloak = keycloak or KeycloakAdminClient()

    @staticmethod
    def _salida(u: dict, rol: str) -> UsuarioOut:
        return UsuarioOut(id=u["id"], usuario=u.get("username", ""), nombre=u.get("firstName", ""),
                          apellido=u.get("lastName", ""), email=u.get("email", ""), rol=rol,
                          habilitado=bool(u.get("enabled", False)))

    def listar(self) -> list[UsuarioOut]:
        por_id: dict[str, UsuarioOut] = {}
        for rol in ROLES_PERSONAL:  # si alguien tuviera los dos roles, prevalece administrador_sistema
            for u in self.keycloak.usuarios_con_rol(rol):
                por_id[u["id"]] = self._salida(u, rol)
        return sorted(por_id.values(), key=lambda u: (u.rol, u.apellido.lower(), u.nombre.lower()))

    def _del_personal(self, usuario_id: str) -> tuple[dict, str]:
        roles = self.keycloak.roles_de(usuario_id) & set(ROLES_PERSONAL)
        if not roles:
            raise UsuarioInexistente("La cuenta no pertenece al personal municipal.")
        return self.keycloak.obtener(usuario_id), (ADMIN if ADMIN in roles else "administrativo")

    def obtener(self, usuario_id: str) -> UsuarioOut:
        datos, rol = self._del_personal(usuario_id)
        return self._salida(datos, rol)

    def crear(self, nuevo: UsuarioNuevo) -> UsuarioOut:
        usuario_id = self.keycloak.crear(nuevo.usuario.lower(), nuevo.nombre.strip(), nuevo.apellido.strip(),
                                         str(nuevo.email), nuevo.clave_temporal)
        try:
            self.keycloak.asignar_rol(usuario_id, nuevo.rol)
        except Exception:
            self.keycloak.eliminar(usuario_id)  # sin rol, la cuenta quedaría huérfana
            raise
        return self.obtener(usuario_id)

    def _admins_habilitados(self) -> set[str]:
        return {u["id"] for u in self.keycloak.usuarios_con_rol(ADMIN) if u.get("enabled")}

    def modificar(self, usuario_id: str, cambios: UsuarioCambios, quien: str) -> UsuarioOut:
        actual, rol_actual = self._del_personal(usuario_id)
        deja_de_ser_admin_activo = rol_actual == ADMIN and actual.get("enabled") and (
            cambios.rol != ADMIN or not cambios.habilitado)

        if usuario_id == quien and deja_de_ser_admin_activo:
            raise CambioNoPermitido("No podés deshabilitar tu propia cuenta ni quitarte el rol de administrador del sistema.")
        if deja_de_ser_admin_activo and self._admins_habilitados() <= {usuario_id}:
            raise CambioNoPermitido("Tiene que quedar al menos un administrador del sistema habilitado.")

        self.keycloak.actualizar(usuario_id, cambios.nombre.strip(), cambios.apellido.strip(),
                                 str(cambios.email), cambios.habilitado)
        if cambios.rol != rol_actual:
            self.keycloak.asignar_rol(usuario_id, cambios.rol)
            self.keycloak.quitar_rol(usuario_id, rol_actual)
        return self.obtener(usuario_id)
