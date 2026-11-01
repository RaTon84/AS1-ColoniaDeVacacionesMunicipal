from datetime import date, datetime
from enum import Enum
from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class EstadoInscripcion(str, Enum):
    CONFIRMADA="CONFIRMADA"
    LISTA_ESPERA="LISTA_ESPERA"
    CANCELADA="CANCELADA"

class Inscripcion(Base):
    __tablename__="inscripciones"
    # Un chico no puede tener dos inscripciones activas en la temporada. Las canceladas no cuentan: se puede reinscribir.
    __table_args__=(Index("uq_dni_chico_temporada_activa","dni_chico","temporada",unique=True,postgresql_where=text("estado <> 'CANCELADA'"),sqlite_where=text("estado <> 'CANCELADA'")),)
    id: Mapped[int]=mapped_column(primary_key=True)
    turno_id: Mapped[int]=mapped_column(ForeignKey("turnos.id",ondelete="RESTRICT"),index=True)
    temporada: Mapped[int]=mapped_column(Integer,nullable=False,index=True)
    dni_chico: Mapped[str]=mapped_column(String(20),nullable=False)
    nombre_chico: Mapped[str]=mapped_column(String(100),nullable=False)
    apellido_chico: Mapped[str]=mapped_column(String(100),nullable=False)
    fecha_nacimiento: Mapped[date]=mapped_column(Date,nullable=False)
    dni_tutor: Mapped[str]=mapped_column(String(20),nullable=False)
    nombre_tutor: Mapped[str]=mapped_column(String(120),nullable=False)
    apellido_tutor: Mapped[str]=mapped_column(String(120),nullable=False)
    email_tutor: Mapped[str]=mapped_column(String(180),nullable=False)
    telefono_tutor: Mapped[str]=mapped_column(String(50),nullable=False)
    estado: Mapped[str]=mapped_column(String(30),nullable=False)
    posicion_espera: Mapped[int|None]=mapped_column(Integer,nullable=True)
    creado_por: Mapped[str]=mapped_column(String(120),nullable=False)
    creado_en: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now(),nullable=False)
    turno=relationship("Turno",back_populates="inscripciones")
