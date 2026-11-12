from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, NaiveDatetime, model_validator
from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import CurrentUser, require_roles
from app.modules.administracion.periodo import PeriodoInscripcion
from app.modules.administracion.temporadas import (
    ConfiguracionTemporada,
    obtener_configuracion_activa,
)
from app.modules.inscripciones.model import EstadoInscripcion
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.inscripciones.schemas import AdminInscripcionOut
from app.modules.turnos.model import Turno
from app.modules.turnos.repository import TurnoRepository
from app.modules.turnos.schemas import TurnoOut


router = APIRouter(prefix="/api/v1/admin", tags=["Administración"])
repo = InscripcionRepository()
repo_turnos = TurnoRepository()
hora_argentina = ZoneInfo("America/Argentina/Buenos_Aires")

MAX_CUPOS_TEMPORADA = 600


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


class CupoDistribucionEntrada(BaseModel):
    turno_id: int = Field(gt=0)
    cupo_total: int = Field(ge=0, le=MAX_CUPOS_TEMPORADA)


class DistribucionCuposEntrada(BaseModel):
    temporada: int = Field(ge=1, le=9999)
    turnos: list[CupoDistribucionEntrada] = Field(min_length=1)


@router.put("/distribucion-cupos", response_model=list[TurnoOut])
def guardar_distribucion_cupos(
    payload: DistribucionCuposEntrada,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    cupos_por_turno = {
        turno.turno_id: turno.cupo_total for turno in payload.turnos
    }

    if len(cupos_por_turno) != len(payload.turnos):
        raise HTTPException(status_code=422, detail="Hay turnos repetidos.")

    if sum(cupos_por_turno.values()) > MAX_CUPOS_TEMPORADA:
        raise HTTPException(
            status_code=422,
            detail=f"La temporada admite hasta {MAX_CUPOS_TEMPORADA} cupos.",
        )

    with db.begin():
        # Evita que cambie la temporada activa mientras se guarda la distribución.
        db.execute(text("LOCK TABLE configuracion_temporadas IN SHARE MODE"))
        temporada = obtener_configuracion_activa(db).temporada

        if payload.temporada != temporada:
            raise HTTPException(
                status_code=409,
                detail="La temporada activa cambió. Recargá el panel.",
            )

        # Usa el mismo bloqueo de turno que la creación y la cancelación.
        turnos = list(
            db.scalars(
                select(Turno)
                .where(Turno.temporada == temporada)
                .order_by(Turno.id)
                .with_for_update()
            )
        )

        if set(cupos_por_turno) != {turno.id for turno in turnos}:
            raise HTTPException(
                status_code=409,
                detail="El listado de turnos cambió. Recargá el panel.",
            )

        confirmadas_por_turno = {}

        for turno in turnos:
            confirmadas = repo_turnos.confirmed_count(db, turno.id)

            if cupos_por_turno[turno.id] < confirmadas:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"{turno.sede} · {turno.nombre} ya tiene "
                        f"{confirmadas} inscripciones confirmadas."
                    ),
                )

            confirmadas_por_turno[turno.id] = confirmadas

        resultado = []

        for turno in turnos:
            turno.cupo_total = cupos_por_turno[turno.id]
            disponibles = turno.cupo_total - confirmadas_por_turno[turno.id]

            if disponibles > 0:
                espera = repo.list_waitlist_for_update(db, turno.id, temporada)
                promovidas = espera[:disponibles]

                for inscripcion in promovidas:
                    inscripcion.estado = EstadoInscripcion.CONFIRMADA.value
                    inscripcion.posicion_espera = None

                for posicion, inscripcion in enumerate(
                    espera[len(promovidas):], start=1
                ):
                    inscripcion.posicion_espera = posicion

                disponibles -= len(promovidas)

            resultado.append(
                TurnoOut(
                    id=turno.id,
                    nombre=turno.nombre,
                    sede=turno.sede,
                    fecha_desde=turno.fecha_desde,
                    fecha_hasta=turno.fecha_hasta,
                    cupo_total=turno.cupo_total,
                    temporada=turno.temporada,
                    cupos_disponibles=disponibles,
                )
            )

    return resultado