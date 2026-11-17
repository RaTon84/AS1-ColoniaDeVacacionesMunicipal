from datetime import date
from sqlalchemy import select
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.modules.turnos.model import Turno
from app.modules.inscripciones.model import Inscripcion  # registra el modelo relacionado en SQLAlchemy
from app.seed_demo import seed_demo

def crear_turnos_base(temporada: int) -> list[Turno]:
    turnos = [
        ("Turno mañana - Enero", "Polideportivo Municipal", 1, 6, 24),
        ("Turno tarde - Enero", "Polideportivo Municipal", 1, 6, 24),
        ("Turno mañana - Febrero", "Club Municipal", 2, 2, 20),
        ("Turno tarde - Febrero", "Club Municipal", 2, 2, 20),
    ]

    return [
        Turno(
            nombre=nombre,
            sede=sede,
            fecha_desde=date(temporada, mes, inicio),
            fecha_hasta=date(temporada, mes, fin),
            cupo_total=150,
            temporada=temporada,
        )
        for nombre, sede, mes, inicio, fin in turnos
    ]

def seed():
    settings=get_settings()
    with SessionLocal() as db:
        if db.scalar(select(Turno.id).limit(1)) is not None: return
        db.add_all(crear_turnos_base(settings.temporada))
        db.commit()
    # Solo en una base recién creada: en los reinicios no se vuelve a llenar el turno.
    if settings.seed_demo: seed_demo()
if __name__=="__main__": seed()
