from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_JSON = "application/problem+json"


class ErrorDeDominio(Exception):
    """Base de los errores de negocio. Cada subclase define su código HTTP, tipo y título."""
    status = 400
    tipo = "about:blank"
    titulo = "Solicitud inválida"
    headers: dict[str, str] = {}

    def __init__(self, detalle: str):
        super().__init__(detalle)
        self.detalle = detalle


class EdadFueraDeRango(ErrorDeDominio):
    status, tipo, titulo = 422, "/problemas/edad-fuera-de-rango", "Edad fuera de rango"


class NoResidente(ErrorDeDominio):
    status, tipo, titulo = 422, "/problemas/no-residente", "No figura en el padrón de residentes"


class TurnoInexistente(ErrorDeDominio):
    status, tipo, titulo = 404, "/problemas/turno-inexistente", "Turno inexistente"


class InscripcionInexistente(ErrorDeDominio):
    status, tipo, titulo = 404, "/problemas/inscripcion-inexistente", "Inscripción inexistente"


class InscripcionDuplicada(ErrorDeDominio):
    status, tipo, titulo = 409, "/problemas/inscripcion-duplicada", "Inscripción duplicada"


class PadronNoDisponible(ErrorDeDominio):
    status, tipo, titulo = 503, "/problemas/padron-no-disponible", "Padrón no disponible"
    headers = {"Retry-After": "30"}


def _problem(request: Request, status: int, tipo: str, titulo: str, detalle: str | None,
             headers: dict[str, str] | None = None, **extra) -> JSONResponse:
    cuerpo = {"type": tipo, "title": titulo, "status": status}
    if detalle:
        cuerpo["detail"] = detalle
    cuerpo["instance"] = request.url.path
    cuerpo.update(extra)
    return JSONResponse(jsonable_encoder(cuerpo), status_code=status, headers=headers, media_type=PROBLEM_JSON)


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorDeDominio)
    async def error_de_dominio(request: Request, exc: ErrorDeDominio):
        return _problem(request, exc.status, exc.tipo, exc.titulo, exc.detalle, exc.headers or None)

    @app.exception_handler(StarletteHTTPException)
    async def error_http(request: Request, exc: StarletteHTTPException):
        return _problem(request, exc.status_code, "about:blank", HTTPStatus(exc.status_code).phrase,
                        exc.detail if isinstance(exc.detail, str) else None, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def error_de_validacion(request: Request, exc: RequestValidationError):
        errores = [{"campo": ".".join(str(p) for p in e["loc"][1:]), "mensaje": e["msg"]} for e in exc.errors()]
        return _problem(request, 422, "/problemas/datos-invalidos", "Datos inválidos",
                        "Revise los campos indicados en «errors».", errors=errores)

    @app.exception_handler(Exception)
    async def error_inesperado(request: Request, exc: Exception):
        # El detalle técnico va al log (stdout), no al cliente.
        return _problem(request, 500, "about:blank", "Error interno", "Ocurrió un error inesperado.")
