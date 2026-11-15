from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from app.modules.inscripciones.model import EstadoInscripcion, Inscripcion

class InscripcionRepository:
    def exists_for_dni_and_season(self, db:Session,dni:str,temporada:int,excluir_id:int|None=None)->bool:
        condiciones=[Inscripcion.dni_chico==dni,Inscripcion.temporada==temporada,Inscripcion.estado!=EstadoInscripcion.CANCELADA.value]
        if excluir_id is not None:
            condiciones.append(Inscripcion.id!=excluir_id)
        return db.scalar(select(Inscripcion.id).where(*condiciones).limit(1)) is not None
    def add(self,db:Session,inscription:Inscripcion)->Inscripcion:
        db.add(inscription); db.flush(); db.refresh(inscription); return inscription
    def get(self,db:Session,inscripcion_id:int)->Inscripcion|None:
        return db.get(Inscripcion,inscripcion_id)
    def list_all(self,db:Session,temporada:int)->list[Inscripcion]:
        return list(db.scalars(select(Inscripcion).where(Inscripcion.temporada==temporada).order_by(Inscripcion.creado_en,Inscripcion.id)))
    def temporadas_con_inscripciones(self, db: Session) -> dict[int, int]:
        filas = db.execute(select(Inscripcion.temporada, func.count(Inscripcion.id)).group_by(Inscripcion.temporada)).all()
        return {temporada: cantidad for temporada, cantidad in filas}
    def list_by_user(self,db:Session,subject:str,temporada:int,email:str|None=None)->list[Inscripcion]:
        # Un tutor ve lo que cargó y también lo que la oficina cargó con su correo.
        condiciones=[Inscripcion.creado_por==subject]
        if email:
            condiciones.append(func.lower(Inscripcion.email_tutor)==email.strip().lower())
        return list(db.scalars(select(Inscripcion).where(or_(*condiciones),Inscripcion.temporada==temporada).order_by(Inscripcion.creado_en.desc())))
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