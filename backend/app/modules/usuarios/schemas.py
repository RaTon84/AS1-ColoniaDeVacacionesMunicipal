from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# Solo se gestionan las cuentas del personal municipal; los tutores no.
RolPersonal = Literal["administrativo", "administrador_sistema"]


class UsuarioNuevo(BaseModel):
    usuario: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9._-]+$")
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email: EmailStr
    rol: RolPersonal
    clave_temporal: str = Field(min_length=8, max_length=100)


class UsuarioCambios(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email: EmailStr
    rol: RolPersonal
    habilitado: bool


class UsuarioOut(BaseModel):
    id: str
    usuario: str
    nombre: str
    apellido: str
    email: str
    rol: RolPersonal
    habilitado: bool
