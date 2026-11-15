from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_roles
from app.modules.administracion.temporadas import obtener_configuracion_activa
from app.modules.inscripciones.model import EstadoInscripcion
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.turnos.constants import MAX_CUPOS_TEMPORADA
from app.modules.turnos.model import Turno
from app.modules.turnos.repository import TurnoRepository
from app.modules.turnos.schemas import CopiarTurnosEntrada, TurnoEntrada, TurnoOut


router = APIRouter(prefix="/api/v1/turnos", tags=["Turnos"])
admin_router = APIRouter(prefix="/api/v1/admin/turnos", tags=["Administración"])
repo = TurnoRepository()
repo_inscripciones = InscripcionRepository()


def _salida(db: Session, turno: Turno) -> TurnoOut:
    confirmadas = repo.confirmed_count(db, turno.id)

    return TurnoOut(
        id=turno.id,
        nombre=turno.nombre,
        sede=turno.sede,
        fecha_desde=turno.fecha_desde,
        fecha_hasta=turno.fecha_hasta,
        cupo_total=turno.cupo_total,
        temporada=turno.temporada,
        cupos_disponibles=max(turno.cupo_total - confirmadas, 0),
    )


def _promover_lista_espera(db: Session, turno: Turno) -> None:
    confirmadas = repo.confirmed_count(db, turno.id)
    disponibles = max(turno.cupo_total - confirmadas, 0)

    if disponibles <= 0:
        return

    espera = repo_inscripciones.list_waitlist_for_update(
        db, turno.id, turno.temporada
    )
    promovidas = espera[:disponibles]

    for inscripcion in promovidas:
        inscripcion.estado = EstadoInscripcion.CONFIRMADA.value
        inscripcion.posicion_espera = None

    for posicion, inscripcion in enumerate(
        espera[len(promovidas):], start=1
    ):
        inscripcion.posicion_espera = posicion

    db.flush()


def _mover_fecha(fecha: date, temporada_origen: int, temporada_destino: int) -> date:
    anio = fecha.year + (temporada_destino - temporada_origen)

    try:
        return fecha.replace(year=anio)
    except ValueError:
        # 29 de febrero en un año bisiesto que pasa a uno no bisiesto.
        return fecha.replace(year=anio, day=28)


def _validar_fechas_de_temporada(temporada: int, payload: TurnoEntrada) -> None:
    inicio = date(temporada, 1, 1)
    fin = date(temporada, 12, 31)

    if not (
        inicio <= payload.fecha_desde <= fin
        and inicio <= payload.fecha_hasta <= fin
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Las fechas del turno deben estar dentro de la temporada "
                f"{temporada}."
            ),
        )


def _validar_sin_superposicion(
    db: Session,
    temporada: int,
    payload: TurnoEntrada,
    excluir_turno_id: int | None = None,
) -> None:
    if repo.find_overlapping(
        db,
        temporada,
        payload.nombre,
        payload.sede,
        payload.fecha_desde,
        payload.fecha_hasta,
        excluir_turno_id,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe un turno con el mismo nombre y sede que se "
                "superpone en fechas."
            ),
        )


@router.get("", response_model=list[TurnoOut])
def list_turnos(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    temporada = obtener_configuracion_activa(db).temporada
    return [_salida(db, turno) for turno in repo.list(db, temporada)]


@admin_router.get("", response_model=list[TurnoOut])
def listar_turnos_administracion(
    temporada: int | None = Query(default=None, ge=1, le=9999),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    if temporada is None:
        temporada = obtener_configuracion_activa(db).temporada

    return [_salida(db, turno) for turno in repo.list(db, temporada)]


@admin_router.post("", response_model=TurnoOut, status_code=201)
def crear_turno(
    payload: TurnoEntrada,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    with db.begin():
        db.execute(
            text("LOCK TABLE configuracion_temporadas IN SHARE MODE")
        )
        temporada = obtener_configuracion_activa(db).temporada
        _validar_fechas_de_temporada(temporada, payload)

        if repo.cupos_total(db, temporada) + payload.cupo_total > MAX_CUPOS_TEMPORADA:
            raise HTTPException(
                status_code=422,
                detail=f"La temporada admite hasta {MAX_CUPOS_TEMPORADA} cupos.",
            )

        _validar_sin_superposicion(db, temporada, payload)

        turno = repo.add(
            db,
            Turno(temporada=temporada, **payload.model_dump()),
        )
        resultado = _salida(db, turno)

    return resultado


@admin_router.post("/copiar", response_model=list[TurnoOut], status_code=201)
def copiar_turnos(
    payload: CopiarTurnosEntrada,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    with db.begin():
        db.execute(
            text("LOCK TABLE configuracion_temporadas IN SHARE MODE")
        )
        temporada = obtener_configuracion_activa(db).temporada

        if repo.list(db, temporada):
            raise HTTPException(
                status_code=409,
                detail="La temporada activa ya tiene turnos cargados.",
            )

        origen = payload.temporada_origen or repo.previous_temporada(
            db, temporada
        )

        if origen is None:
            raise HTTPException(
                status_code=404,
                detail="No hay una temporada anterior con turnos para copiar.",
            )

        if origen == temporada:
            raise HTTPException(
                status_code=422,
                detail="La temporada de origen debe ser distinta de la activa.",
            )

        turnos_origen = repo.list(db, origen)

        if not turnos_origen:
            raise HTTPException(
                status_code=404,
                detail=f"La temporada {origen} no tiene turnos para copiar.",
            )

        if sum(turno.cupo_total for turno in turnos_origen) > MAX_CUPOS_TEMPORADA:
            raise HTTPException(
                status_code=422,
                detail=f"La temporada admite hasta {MAX_CUPOS_TEMPORADA} cupos.",
            )

        nuevos = []

        for turno in turnos_origen:
            nuevos.append(
                repo.add(
                    db,
                    Turno(
                        nombre=turno.nombre,
                        sede=turno.sede,
                        fecha_desde=_mover_fecha(
                            turno.fecha_desde, origen, temporada
                        ),
                        fecha_hasta=_mover_fecha(
                            turno.fecha_hasta, origen, temporada
                        ),
                        cupo_total=turno.cupo_total,
                        temporada=temporada,
                    ),
                )
            )

        resultado = [_salida(db, turno) for turno in nuevos]

    return resultado


@admin_router.put("/{turno_id}", response_model=TurnoOut)
def actualizar_turno(
    turno_id: int,
    payload: TurnoEntrada,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    with db.begin():
        db.execute(
            text("LOCK TABLE configuracion_temporadas IN SHARE MODE")
        )
        temporada = obtener_configuracion_activa(db).temporada
        turno = repo.get_for_update(db, turno_id)

        if turno is None or turno.temporada != temporada:
            raise HTTPException(
                status_code=404,
                detail="No existe el turno en la temporada activa.",
            )

        _validar_fechas_de_temporada(temporada, payload)

        confirmadas = repo.confirmed_count(db, turno.id)

        if payload.cupo_total < confirmadas:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"{turno.sede} · {turno.nombre} ya tiene "
                    f"{confirmadas} inscripciones confirmadas."
                ),
            )

        if (
            repo.cupos_total(db, temporada, excluir_turno_id=turno.id)
            + payload.cupo_total
            > MAX_CUPOS_TEMPORADA
        ):
            raise HTTPException(
                status_code=422,
                detail=f"La temporada admite hasta {MAX_CUPOS_TEMPORADA} cupos.",
            )

        _validar_sin_superposicion(db, temporada, payload, turno.id)

        turno.nombre = payload.nombre
        turno.sede = payload.sede
        turno.fecha_desde = payload.fecha_desde
        turno.fecha_hasta = payload.fecha_hasta
        turno.cupo_total = payload.cupo_total

        db.flush()
        _promover_lista_espera(db, turno)
        resultado = _salida(db, turno)

    return resultado


@admin_router.delete("/{turno_id}", status_code=204)
def eliminar_turno(
    turno_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("administrador_sistema")),
):
    with db.begin():
        db.execute(
            text("LOCK TABLE configuracion_temporadas IN SHARE MODE")
        )
        temporada = obtener_configuracion_activa(db).temporada
        turno = repo.get_for_update(db, turno_id)

        if turno is None or turno.temporada != temporada:
            raise HTTPException(
                status_code=404,
                detail="No existe el turno en la temporada activa.",
            )

        if repo.inscriptions_count(db, turno.id):
            raise HTTPException(
                status_code=409,
                detail=(
                    "El turno tiene inscripciones asociadas. "
                    "No se puede eliminar."
                ),
            )

        repo.delete(db, turno)

    return None
