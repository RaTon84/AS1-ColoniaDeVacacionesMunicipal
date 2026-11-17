"""Datos de demostración: deja un turno casi completo para probar la lista de espera.

Corre solo al crear la base si SEED_DEMO=true (así viene en el docker-compose del TP; en el
servidor real va en false). También se puede ejecutar a mano, con el sistema levantado:

    docker compose exec app python -m app.seed_demo               # primer turno, deja 2 cupos libres
    docker compose exec app python -m app.seed_demo --turno 3 --libres 1

Se puede correr varias veces: solo agrega las inscripciones que faltan para llegar a la meta.
Las inscripciones se crean directo en la base (sin consultar el padrón) con creado_por = "seed-demo"
y DNIs de chico que empiezan con 8 y tienen 10 dígitos, que no coinciden con DNIs reales.
"""
import argparse
from datetime import date

from sqlalchemy import select

from app.core.database import SessionLocal
from app.modules.administracion.temporadas import obtener_configuracion_activa
from app.modules.inscripciones.model import EstadoInscripcion, Inscripcion
from app.modules.turnos.model import Turno
from app.modules.turnos.repository import TurnoRepository

CREADO_POR = "seed-demo"
NOMBRES = ["Sofía", "Mateo", "Valentina", "Benjamín", "Martina", "Thiago", "Catalina", "Santino",
           "Emilia", "Joaquín", "Isabella", "Bautista", "Olivia", "Lautaro", "Mía", "Felipe"]
APELLIDOS = ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez",
             "Romero", "Sosa", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Benítez"]


def seed_demo(turno_id: int | None = None, libres: int = 2) -> None:
    turnos = TurnoRepository()
    with SessionLocal() as db, db.begin():
        configuracion = obtener_configuracion_activa(db)
        temporada = configuracion.temporada

        consulta = select(Turno).where(Turno.temporada == temporada).order_by(Turno.id)
        if turno_id is not None:
            consulta = consulta.where(Turno.id == turno_id)
        turno = db.scalar(consulta.limit(1).with_for_update())
        if turno is None:
            print(f"No hay un turno {turno_id or ''} en la temporada {temporada}.")
            return

        meta = max(turno.cupo_total - libres, 0)
        confirmadas = turnos.confirmed_count(db, turno.id)
        faltan = meta - confirmadas
        if faltan <= 0:
            print(f"{turno.nombre}: ya tiene {confirmadas} de {turno.cupo_total} cupos ocupados; no se agrega nada.")
            return

        usados = set(db.scalars(select(Inscripcion.dni_chico).where(Inscripcion.temporada == temporada)))
        edades = range(configuracion.edad_minima, configuracion.edad_maxima + 1)
        nuevas, i = [], 0
        while len(nuevas) < faltan:
            i += 1
            dni = f"8{turno.id:03d}{i:06d}"
            if dni in usados:
                continue
            n = len(nuevas)
            edad = edades[n % len(edades)]
            nuevas.append(Inscripcion(
                turno_id=turno.id,
                temporada=temporada,
                dni_chico=dni,
                nombre_chico=NOMBRES[n % len(NOMBRES)],
                apellido_chico=APELLIDOS[(n + n // len(NOMBRES)) % len(APELLIDOS)],
                # Cumple años a mitad de año: tiene `edad` años al inicio de la temporada.
                fecha_nacimiento=date(temporada - edad - 1, 6, 15),
                dni_tutor=f"7{turno.id:03d}{i:06d}",
                nombre_tutor="Tutor",
                apellido_tutor="Demo",
                email_tutor=f"familia{i}@example.com",
                telefono_tutor="1144445555",
                estado=EstadoInscripcion.CONFIRMADA.value,
                posicion_espera=None,
                creado_por=CREADO_POR,
            ))
        db.add_all(nuevas)
        print(f"{turno.nombre} (id {turno.id}): {len(nuevas)} inscripciones confirmadas agregadas; "
              f"cupos libres: {turno.cupo_total - meta}. Cuando se ocupen, las siguientes inscripciones "
              f"van a lista de espera.")


if __name__ == "__main__":
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument("--turno", type=int, help="id del turno (por defecto, el primero de la temporada)")
    argumentos.add_argument("--libres", type=int, default=2, help="cupos que quedan libres (por defecto 2)")
    a = argumentos.parse_args()
    seed_demo(a.turno, max(a.libres, 0))
