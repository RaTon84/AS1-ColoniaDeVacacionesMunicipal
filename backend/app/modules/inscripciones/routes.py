from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_roles
from app.modules.administracion.periodo import PeriodoInscripcion
from app.modules.administracion.temporadas import obtener_configuracion_activa
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.inscripciones.schemas import InscripcionCreate, InscripcionOut
from app.modules.inscripciones.service import InscripcionService

router = APIRouter(prefix="/api/v1", tags=["Inscripciones"])
repo = InscripcionRepository()
service = InscripcionService()


@router.get("/periodo-inscripcion")
def consultar_periodo_inscripcion(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(
        require_roles("tutor", "administrativo", "administrador_sistema")
    ),
):
    temporada = obtener_configuracion_activa(db).temporada
    periodo = db.get(PeriodoInscripcion, temporada)

    if periodo is None:
        return {
            "estado": "sin_configurar",
            "apertura": None,
            "cierre": None,
        }

    ahora = datetime.now(timezone.utc)

    if ahora < periodo.apertura:
        estado = "pendiente"
    elif ahora >= periodo.cierre:
        estado = "cerrado"
    else:
        estado = "abierto"

    return {
        "estado": estado,
        "apertura": periodo.apertura,
        "cierre": periodo.cierre,
    }


@router.post("/inscripciones", response_model=InscripcionOut, status_code=201)
def crear(
    payload: InscripcionCreate,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_roles("tutor", "administrativo", "administrador_sistema")
    ),
):
    nueva = service.crear(db, payload, user.sub)
    response.headers["Location"] = (
        f"/api/v1/inscripciones/{nueva.id}"  # 201 + Location (Clase 9)
    )
    return nueva


@router.get("/inscripciones/{id}", response_model=InscripcionOut)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    ve_todas = bool(user.roles & {"administrativo", "administrador_sistema"})
    return service.obtener(db, id, user.sub, ve_todas)


@router.get("/mis-inscripciones", response_model=list[InscripcionOut])
def mias(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    temporada = obtener_configuracion_activa(db).temporada
    return repo.list_by_user(db, user.sub, temporada)


@router.post(
    "/inscripciones/{id}/cancelar",
    response_model=InscripcionOut,
)
def cancelar(
    id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_roles(
            "tutor",
            "administrativo",
            "administrador_sistema",
        )
    ),
):
    ve_todas = bool(user.roles & {"administrativo", "administrador_sistema"})

    return service.cancelar(
        db=db,
        inscripcion_id=id,
        usuario=user.sub,
        ve_todas=ve_todas,
    )