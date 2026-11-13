from sqlalchemy import Boolean, CheckConstraint, Index, false, select, text
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.config import get_settings
from app.core.database import Base


class ConfiguracionTemporada(Base):
    __tablename__ = "configuracion_temporadas"
    __table_args__ = (
        CheckConstraint(
            "edad_minima >= 0 AND edad_maxima >= edad_minima",
            name="ck_configuracion_temporadas_edades",
        ),
        Index(
            "uq_configuracion_temporadas_activa",
            "activa",
            unique=True,
            postgresql_where=text("activa IS TRUE"),
        ),
    )

    temporada: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=False,
    )
    edad_minima: Mapped[int] = mapped_column(nullable=False)
    edad_maxima: Mapped[int] = mapped_column(nullable=False)
    activa: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )


def obtener_configuracion_activa(db: Session) -> ConfiguracionTemporada:
    configuracion = db.scalar(
        select(ConfiguracionTemporada).where(
            ConfiguracionTemporada.activa.is_(True)
        )
    )

    if configuracion is not None:
        return configuracion

    return ConfiguracionTemporada(
        temporada=get_settings().temporada,
        edad_minima=6,
        edad_maxima=12,
        activa=True,
    )