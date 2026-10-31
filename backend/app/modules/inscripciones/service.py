from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import EdadFueraDeRango, InscripcionDuplicada, InscripcionInexistente, NoResidente, TurnoInexistente
from app.modules.inscripciones.model import EstadoInscripcion, Inscripcion
from app.modules.inscripciones.schemas import InscripcionCreate
from app.integrations.padron import PadronClient
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.turnos.repository import TurnoRepository


class InscripcionService:
    def __init__(self):
        self.settings = get_settings()
        self.inscripciones = InscripcionRepository()
        self.turnos = TurnoRepository()
        self.padron = PadronClient()

    @staticmethod
    def _edad_al_inicio_temporada(fecha_nacimiento: date, temporada: int) -> int:
        referencia = date(temporada, 1, 1)
        return referencia.year - fecha_nacimiento.year - ((referencia.month, referencia.day) < (fecha_nacimiento.month, fecha_nacimiento.day))

    def obtener(self, db: Session, inscripcion_id: int, usuario: str, ve_todas: bool) -> Inscripcion:
        """Un tutor solo ve las inscripciones que cargó; la oficina ve todas.
        Si no le corresponde verla, responde como inexistente para no revelar que existe."""
        inscripcion = self.inscripciones.get(db, inscripcion_id)
        if inscripcion is None or (not ve_todas and inscripcion.creado_por != usuario):
            raise InscripcionInexistente(f"No existe la inscripción {inscripcion_id}")
        return inscripcion

    def crear(self, db: Session, payload: InscripcionCreate, creado_por: str) -> Inscripcion:
        edad = self._edad_al_inicio_temporada(payload.fecha_nacimiento, self.settings.temporada)
        if edad < 6 or edad > 12:
            raise EdadFueraDeRango("La colonia admite chicos de 6 a 12 años al inicio de la temporada")

        if not self.padron.es_residente(payload.dni_tutor):
            raise NoResidente("El tutor no figura con domicilio en la jurisdicción")

        try:
            with db.begin():
                turno = self.turnos.get_for_update(db, payload.turno_id)
                if not turno or turno.temporada != self.settings.temporada:
                    raise TurnoInexistente(f"No existe el turno {payload.turno_id} en la temporada {self.settings.temporada}")

                if self.inscripciones.exists_for_dni_and_season(db, payload.dni_chico, self.settings.temporada):
                    raise InscripcionDuplicada("El chico ya está inscripto en esta temporada")

                confirmadas = self.turnos.confirmed_count(db, turno.id)
                if confirmadas < turno.cupo_total:
                    estado = EstadoInscripcion.CONFIRMADA.value
                    posicion = None
                else:
                    estado = EstadoInscripcion.LISTA_ESPERA.value
                    posicion = self.turnos.waitlist_count(db, turno.id) + 1

                nueva = Inscripcion(
                    turno_id=turno.id,
                    temporada=self.settings.temporada,
                    dni_chico=payload.dni_chico.strip(),
                    nombre_chico=payload.nombre_chico.strip(),
                    apellido_chico=payload.apellido_chico.strip(),
                    fecha_nacimiento=payload.fecha_nacimiento,
                    dni_tutor=payload.dni_tutor.strip(),
                    nombre_tutor=payload.nombre_tutor.strip(),
                    email_tutor=str(payload.email_tutor),
                    telefono_tutor=payload.telefono_tutor.strip(),
                    estado=estado,
                    posicion_espera=posicion,
                    creado_por=creado_por,
                )
                return self.inscripciones.add(db, nueva)
        except IntegrityError as exc:
            db.rollback()
            raise InscripcionDuplicada("El chico ya está inscripto en esta temporada") from exc
