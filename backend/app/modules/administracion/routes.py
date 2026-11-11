from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, NaiveDatetime, model_validator
from sqlalchemy import text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import CurrentUser, require_roles
from app.modules.administracion.periodo import PeriodoInscripcion
from app.modules.administracion.temporadas import (
    ConfiguracionTemporada,
    obtener_configuracion_activa,
)
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.inscripciones.schemas import AdminInscripcionOut


router = APIRouter(prefix="/api/v1/admin", tags=["Administración"])
repo = InscripcionRepository()
hora_argentina = ZoneInfo("America/Argentina/Buenos_Aires")


class PeriodoEntrada(BaseModel):
    apertura: NaiveDatetime
    cierre: NaiveDatetime

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.cierre <= self.apertura:
            raise ValueError("El cierre debe ser posterior a la apertura.")
        return self


class PeriodoSalida(BaseModel):
    temporada: int
    apertura: datetime | None = None
    cierre: datetime | None = None


@router.get("/inscripciones", response_model=list[AdminInscripcionOut])
def listar(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrativo", "administrador_sistema")),
):
    temporada = obtener_configuracion_activa(db).temporada
    return repo.list_all(db, temporada)


@router.get("/periodo-inscripcion", response_model=PeriodoSalida)
def consultar_periodo(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    temporada = obtener_configuracion_activa(db).temporada
    periodo = db.get(PeriodoInscripcion, temporada)

    if periodo is None:
        return PeriodoSalida(temporada=temporada)

    return PeriodoSalida(
        temporada=periodo.temporada,
        apertura=periodo.apertura.astimezone(hora_argentina),
        cierre=periodo.cierre.astimezone(hora_argentina),
    )


@router.put("/periodo-inscripcion", response_model=PeriodoSalida)
def guardar_periodo(
    payload: PeriodoEntrada,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    temporada = obtener_configuracion_activa(db).temporada
    fechas = {
        "apertura": payload.apertura.replace(tzinfo=hora_argentina),
        "cierre": payload.cierre.replace(tzinfo=hora_argentina),
    }

    consulta = insert(PeriodoInscripcion).values(
        temporada=temporada,
        **fechas,
    )

    db.execute(
        consulta.on_conflict_do_update(
            index_elements=[PeriodoInscripcion.temporada],
            set_=fechas,
        )
    )
    db.commit()

    return PeriodoSalida(temporada=temporada, **fechas)


class ConfiguracionTemporadaEntrada(BaseModel):
    temporada: int = Field(ge=1, le=9999)
    edad_minima: int = Field(ge=0)
    edad_maxima: int = Field(ge=0)

    @model_validator(mode="after")
    def validar_edades(self):
        if self.edad_maxima < self.edad_minima:
            raise ValueError(
                "La edad máxima debe ser mayor o igual a la edad mínima."
            )
        return self


@router.get("/configuracion-temporada", response_model=ConfiguracionTemporadaEntrada)
def consultar_configuracion_temporada(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    configuracion = obtener_configuracion_activa(db)

    return ConfiguracionTemporadaEntrada(
        temporada=configuracion.temporada,
        edad_minima=configuracion.edad_minima,
        edad_maxima=configuracion.edad_maxima,
    )


@router.put("/configuracion-temporada", response_model=ConfiguracionTemporadaEntrada)
def guardar_configuracion_temporada(
    payload: ConfiguracionTemporadaEntrada,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    # Serializa los guardados para que dos pedidos no activen años distintos.
    db.execute(text("LOCK TABLE configuracion_temporadas IN SHARE ROW EXCLUSIVE MODE"))

    db.execute(
        update(ConfiguracionTemporada)
        .where(
            ConfiguracionTemporada.activa.is_(True),
            ConfiguracionTemporada.temporada != payload.temporada,
        )
        .values(activa=False)
    )

    valores = payload.model_dump()
    consulta = insert(ConfiguracionTemporada).values(**valores, activa=True)

    db.execute(
        consulta.on_conflict_do_update(
            index_elements=[ConfiguracionTemporada.temporada],
            set_={
                "edad_minima": payload.edad_minima,
                "edad_maxima": payload.edad_maxima,
                "activa": True,
            },
        )
    )
    db.commit()

    return payload