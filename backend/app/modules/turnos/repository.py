from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.modules.turnos.model import Turno
from app.modules.inscripciones.model import EstadoInscripcion, Inscripcion

class TurnoRepository:
    def list(self, db: Session, temporada: int) -> list[Turno]:
        return list(db.scalars(select(Turno).where(Turno.temporada == temporada).order_by(Turno.id)))
    def get(self, db: Session, turno_id: int) -> Turno | None:
        return db.get(Turno, turno_id)
    def get_for_update(self, db: Session, turno_id: int) -> Turno | None:
        return db.scalar(select(Turno).where(Turno.id == turno_id).with_for_update())
    def add(self, db: Session, turno: Turno) -> Turno:
        db.add(turno); db.flush(); db.refresh(turno); return turno
    def delete(self, db: Session, turno: Turno) -> None:
        db.delete(turno); db.flush()
    def confirmed_count(self, db: Session, turno_id: int) -> int:
        return int(db.scalar(select(func.count(Inscripcion.id)).where(Inscripcion.turno_id==turno_id, Inscripcion.estado==EstadoInscripcion.CONFIRMADA.value)) or 0)
    def waitlist_count(self, db: Session, turno_id: int) -> int:
        return int(db.scalar(select(func.count(Inscripcion.id)).where(Inscripcion.turno_id==turno_id, Inscripcion.estado==EstadoInscripcion.LISTA_ESPERA.value)) or 0)
    def inscriptions_count(self, db: Session, turno_id: int) -> int:
        return int(db.scalar(select(func.count(Inscripcion.id)).where(Inscripcion.turno_id==turno_id)) or 0)
    def cupos_total(self, db: Session, temporada: int, excluir_turno_id: int | None = None) -> int:
        consulta = select(func.coalesce(func.sum(Turno.cupo_total), 0)).where(Turno.temporada == temporada)
        if excluir_turno_id is not None:
            consulta = consulta.where(Turno.id != excluir_turno_id)
        return int(db.scalar(consulta) or 0)
    def previous_temporada(self, db: Session, temporada: int) -> int | None:
        return db.scalar(select(func.max(Turno.temporada)).where(Turno.temporada < temporada))
    def find_overlapping(self, db: Session, temporada: int, nombre: str, sede: str, fecha_desde, fecha_hasta, excluir_turno_id: int | None = None) -> bool:
        """Un turno se superpone con otro del mismo nombre y sede en la temporada."""
        condiciones = [
            Turno.temporada == temporada,
            func.lower(Turno.nombre) == nombre.strip().lower(),
            func.lower(Turno.sede) == sede.strip().lower(),
            Turno.fecha_desde <= fecha_hasta,
            Turno.fecha_hasta >= fecha_desde,
        ]
        if excluir_turno_id is not None:
            condiciones.append(Turno.id != excluir_turno_id)
        return db.scalar(select(Turno.id).where(*condiciones).limit(1)) is not None
    def temporadas_con_turnos(self, db: Session) -> dict[int, int]:
        filas = db.execute(select(Turno.temporada, func.count(Turno.id)).group_by(Turno.temporada)).all()
        return {temporada: cantidad for temporada, cantidad in filas}
