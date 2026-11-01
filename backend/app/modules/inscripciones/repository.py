from sqlalchemy import select
from sqlalchemy.orm import Session
from app.modules.inscripciones.model import EstadoInscripcion, Inscripcion

class InscripcionRepository:
    def exists_for_dni_and_season(self, db:Session,dni:str,temporada:int)->bool:
        return db.scalar(select(Inscripcion.id).where(Inscripcion.dni_chico==dni,Inscripcion.temporada==temporada,Inscripcion.estado!=EstadoInscripcion.CANCELADA.value).limit(1)) is not None
    def add(self,db:Session,inscription:Inscripcion)->Inscripcion:
        db.add(inscription); db.flush(); db.refresh(inscription); return inscription
    def get(self,db:Session,inscripcion_id:int)->Inscripcion|None:
        return db.get(Inscripcion,inscripcion_id)
    def list_all(self,db:Session,temporada:int)->list[Inscripcion]:
        return list(db.scalars(select(Inscripcion).where(Inscripcion.temporada==temporada).order_by(Inscripcion.creado_en,Inscripcion.id)))
    def list_by_user(self,db:Session,subject:str,temporada:int)->list[Inscripcion]:
        return list(db.scalars(select(Inscripcion).where(Inscripcion.creado_por==subject,Inscripcion.temporada==temporada).order_by(Inscripcion.creado_en.desc())))
    def list_waitlist_for_update(self, db: Session, turno_id: int, temporada: int,) -> list[Inscripcion]:
        consulta = (select(Inscripcion)
            .where(
                Inscripcion.turno_id == turno_id,
                Inscripcion.temporada == temporada,
                Inscripcion.estado == "LISTA_ESPERA",
            )
            .order_by(
                Inscripcion.posicion_espera,
                Inscripcion.creado_en,
                Inscripcion.id,
            )
            .with_for_update()
        )

        return list(db.scalars(consulta))