from datetime import date, datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    EdadFueraDeRango,
    InscripcionDuplicada,
    InscripcionInexistente,
    InscripcionNoEditable,
    NoResidente,
    PeriodoNoAbierto,
    TurnoInexistente,
)
from app.modules.administracion.periodo import PeriodoInscripcion
from app.modules.administracion.temporadas import obtener_configuracion_activa
from app.modules.inscripciones.model import EstadoInscripcion, Inscripcion
from app.modules.inscripciones.schemas import InscripcionCreate, InscripcionEditar
from app.integrations.padron import PadronClient
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.turnos.repository import TurnoRepository


class InscripcionService:
    def __init__(self):
        self.inscripciones = InscripcionRepository()
        self.turnos = TurnoRepository()
        self.padron = PadronClient()

    @staticmethod
    def _validar_periodo_abierto(db: Session, temporada: int) -> None:
        """El período se configura desde el panel y debe cumplirse también en la API."""
        periodo = db.get(PeriodoInscripcion, temporada)

        if periodo is None:
            raise PeriodoNoAbierto(
                "El período de inscripción de la temporada todavía no está configurado."
            )

        ahora = datetime.now(timezone.utc)

        if ahora < periodo.apertura:
            raise PeriodoNoAbierto(
                "El período de inscripción todavía no abrió."
            )

        if ahora >= periodo.cierre:
            raise PeriodoNoAbierto("El período de inscripción está cerrado.")

    @staticmethod
    def _edad_al_inicio_temporada(fecha_nacimiento: date, temporada: int) -> int:
        referencia = date(temporada, 1, 1)
        return (
            referencia.year
            - fecha_nacimiento.year
            - (
                (referencia.month, referencia.day)
                < (fecha_nacimiento.month, fecha_nacimiento.day)
            )
        )

    @staticmethod
    def _es_propietario(
        inscripcion: Inscripcion, usuario: str, email: str | None
    ) -> bool:
        """El tutor dueño es quien la cargó o el titular del correo declarado."""
        if inscripcion.creado_por == usuario:
            return True

        return bool(email) and (
            inscripcion.email_tutor.strip().lower() == email.strip().lower()
        )

    def obtener(
        self,
        db: Session,
        inscripcion_id: int,
        usuario: str,
        ve_todas: bool,
        email: str | None = None,
    ) -> Inscripcion:
        """Un tutor solo ve las inscripciones que cargó; la oficina ve todas.
        Si no le corresponde verla, responde como inexistente para no revelar que existe.
        """
        inscripcion = self.inscripciones.get(db, inscripcion_id)
        if inscripcion is None or (
            not ve_todas
            and not self._es_propietario(inscripcion, usuario, email)
        ):
            raise InscripcionInexistente(f"No existe la inscripción {inscripcion_id}")
        return inscripcion

    def crear(
        self, db: Session, payload: InscripcionCreate, creado_por: str
    ) -> Inscripcion:
        try:
            with db.begin():
                configuracion = obtener_configuracion_activa(db)
                temporada = configuracion.temporada
                self._validar_periodo_abierto(db, temporada)
                edad = self._edad_al_inicio_temporada(
                    payload.fecha_nacimiento, temporada
                )

                if not configuracion.edad_minima <= edad <= configuracion.edad_maxima:
                    raise EdadFueraDeRango(
                        f"La colonia admite chicos de {configuracion.edad_minima} "
                        f"a {configuracion.edad_maxima} años al inicio de la temporada"
                    )

                if not self.padron.es_residente(payload.dni_tutor):
                    raise NoResidente("El tutor no figura con domicilio en la jurisdicción")

                turno = self.turnos.get_for_update(db, payload.turno_id)
                if not turno or turno.temporada != temporada:
                    raise TurnoInexistente(
                        f"No existe el turno {payload.turno_id} en la temporada {temporada}"
                    )

                if self.inscripciones.exists_for_dni_and_season(
                    db, payload.dni_chico, temporada
                ):
                    raise InscripcionDuplicada(
                        "El chico ya está inscripto en esta temporada"
                    )

                confirmadas = self.turnos.confirmed_count(db, turno.id)
                if confirmadas < turno.cupo_total:
                    estado = EstadoInscripcion.CONFIRMADA.value
                    posicion = None
                else:
                    estado = EstadoInscripcion.LISTA_ESPERA.value
                    posicion = self.turnos.waitlist_count(db, turno.id) + 1

                nueva = Inscripcion(
                    turno_id=turno.id,
                    temporada=temporada,
                    dni_chico=payload.dni_chico.strip(),
                    nombre_chico=payload.nombre_chico.strip(),
                    apellido_chico=payload.apellido_chico.strip(),
                    fecha_nacimiento=payload.fecha_nacimiento,
                    dni_tutor=payload.dni_tutor.strip(),
                    nombre_tutor=payload.nombre_tutor.strip(),
                    apellido_tutor=payload.apellido_tutor.strip(),
                    email_tutor=str(payload.email_tutor),
                    telefono_tutor=payload.telefono_tutor.strip(),
                    estado=estado,
                    posicion_espera=posicion,
                    creado_por=creado_por,
                )
                return self.inscripciones.add(db, nueva)
        except IntegrityError as exc:
            db.rollback()
            raise InscripcionDuplicada(
                "El chico ya está inscripto en esta temporada"
            ) from exc

    def editar(
        self,
        db: Session,
        inscripcion_id: int,
        payload: InscripcionEditar,
        usuario: str,
        ve_todas: bool,
        email: str | None = None,
    ) -> Inscripcion:
        """Corrige los datos de una inscripción sin moverla de turno.

        Mantiene el estado y la posición en la lista de espera. Se revisan de
        nuevo la edad, el padrón (solo si cambió el DNI del tutor) y la
        inscripción única de la temporada.
        """
        try:
            with db.begin():
                configuracion = obtener_configuracion_activa(db)
                temporada = configuracion.temporada
                inscripcion = self.inscripciones.get(db, inscripcion_id)

                if (
                    inscripcion is None
                    or inscripcion.temporada != temporada
                    or (
                        not ve_todas
                        and not self._es_propietario(inscripcion, usuario, email)
                    )
                ):
                    raise InscripcionInexistente(
                        f"No existe la inscripción {inscripcion_id}"
                    )

                if inscripcion.estado == EstadoInscripcion.CANCELADA.value:
                    raise InscripcionNoEditable(
                        "No se puede editar una inscripción cancelada."
                    )

                edad = self._edad_al_inicio_temporada(
                    payload.fecha_nacimiento, temporada
                )

                if not configuracion.edad_minima <= edad <= configuracion.edad_maxima:
                    raise EdadFueraDeRango(
                        f"La colonia admite chicos de {configuracion.edad_minima} "
                        f"a {configuracion.edad_maxima} años al inicio de la temporada"
                    )

                dni_tutor = payload.dni_tutor.strip()

                # El padrón solo se consulta si el DNI del tutor realmente cambió.
                if dni_tutor != inscripcion.dni_tutor and not self.padron.es_residente(
                    dni_tutor
                ):
                    raise NoResidente(
                        "El tutor no figura con domicilio en la jurisdicción"
                    )

                dni_chico = payload.dni_chico.strip()

                if self.inscripciones.exists_for_dni_and_season(
                    db, dni_chico, temporada, excluir_id=inscripcion.id
                ):
                    raise InscripcionDuplicada(
                        "El chico ya está inscripto en esta temporada"
                    )

                inscripcion.dni_chico = dni_chico
                inscripcion.nombre_chico = payload.nombre_chico.strip()
                inscripcion.apellido_chico = payload.apellido_chico.strip()
                inscripcion.fecha_nacimiento = payload.fecha_nacimiento
                inscripcion.dni_tutor = dni_tutor
                inscripcion.nombre_tutor = payload.nombre_tutor.strip()
                inscripcion.apellido_tutor = payload.apellido_tutor.strip()
                inscripcion.email_tutor = str(payload.email_tutor)
                inscripcion.telefono_tutor = payload.telefono_tutor.strip()

                db.flush()
                return inscripcion
        except IntegrityError as exc:
            db.rollback()
            raise InscripcionDuplicada(
                "El chico ya está inscripto en esta temporada"
            ) from exc

    def cancelar(
        self,
        db: Session,
        inscripcion_id: int,
        usuario: str,
        ve_todas: bool,
        email: str | None = None,
    ) -> Inscripcion:
        with db.begin():
            temporada = obtener_configuracion_activa(db).temporada
            inscripcion = self.inscripciones.get(db, inscripcion_id)

            if (
                inscripcion is None
                or inscripcion.temporada != temporada
                or (
                    not ve_todas
                    and not self._es_propietario(inscripcion, usuario, email)
                )
            ):
                raise InscripcionInexistente(
                    f"No existe la inscripción {inscripcion_id}"
                )

            turno = self.turnos.get_for_update(db, inscripcion.turno_id)

            if turno is None:
                raise TurnoInexistente("No existe el turno")

            db.refresh(inscripcion)

            if inscripcion.estado == EstadoInscripcion.CANCELADA.value:
                return inscripcion

            estaba_confirmada = inscripcion.estado == EstadoInscripcion.CONFIRMADA.value

            inscripcion.estado = EstadoInscripcion.CANCELADA.value
            inscripcion.posicion_espera = None

            db.flush()

            espera = self.inscripciones.list_waitlist_for_update(
                db, turno.id, inscripcion.temporada
            )

            if estaba_confirmada and espera:
                primera = espera.pop(0)
                primera.estado = EstadoInscripcion.CONFIRMADA.value
                primera.posicion_espera = None

            for posicion, pendiente in enumerate(espera, start=1):
                pendiente.posicion_espera = posicion

            db.flush()

            return inscripcion