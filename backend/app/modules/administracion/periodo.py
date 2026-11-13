from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PeriodoInscripcion(Base):
    __tablename__ = "periodos_inscripcion"
    __table_args__ = (
        CheckConstraint("cierre > apertura", name="ck_periodo_inscripcion_orden"),
    )

    temporada: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    apertura: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cierre: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)