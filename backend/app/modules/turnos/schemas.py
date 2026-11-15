from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.modules.turnos.constants import MAX_CUPOS_TEMPORADA


class TurnoOut(BaseModel):
    id: int
    nombre: str
    sede: str
    fecha_desde: date
    fecha_hasta: date
    cupo_total: int
    temporada: int
    cupos_disponibles: int


class TurnoEntrada(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    sede: str = Field(min_length=2, max_length=120)
    fecha_desde: date
    fecha_hasta: date
    cupo_total: int = Field(ge=0, le=MAX_CUPOS_TEMPORADA)

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.fecha_hasta < self.fecha_desde:
            raise ValueError(
                "La fecha de fin debe ser igual o posterior a la de inicio."
            )
        return self


class CopiarTurnosEntrada(BaseModel):
    temporada_origen: int | None = Field(default=None, ge=1, le=9999)
