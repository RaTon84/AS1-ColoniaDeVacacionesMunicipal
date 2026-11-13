from fastapi import APIRouter, Depends, Response

from app.core.security import CurrentUser, require_roles
from app.modules.usuarios.schemas import UsuarioCambios, UsuarioNuevo, UsuarioOut
from app.modules.usuarios.service import UsuarioService

router = APIRouter(prefix="/api/v1/admin/usuarios", tags=["Administración"])
service = UsuarioService()
solo_admin_sistema = require_roles("administrador_sistema")


@router.get("", response_model=list[UsuarioOut])
def listar(_: CurrentUser = Depends(solo_admin_sistema)):
    return service.listar()


@router.post("", response_model=UsuarioOut, status_code=201)
def crear(payload: UsuarioNuevo, response: Response, _: CurrentUser = Depends(solo_admin_sistema)):
    creado = service.crear(payload)
    response.headers["Location"] = f"/api/v1/admin/usuarios/{creado.id}"
    return creado


@router.get("/{id}", response_model=UsuarioOut)
def obtener(id: str, _: CurrentUser = Depends(solo_admin_sistema)):
    return service.obtener(id)


@router.put("/{id}", response_model=UsuarioOut)
def modificar(id: str, payload: UsuarioCambios, user: CurrentUser = Depends(solo_admin_sistema)):
    return service.modificar(id, payload, quien=user.sub)
