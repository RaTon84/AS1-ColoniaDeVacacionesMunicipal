"""Configuración común de los tests.

Los tests corren contra PostgreSQL porque los endpoints usan SQL específico de
Postgres (LOCK TABLE, INSERT ... ON CONFLICT). Nunca deben tocar la base real:
la URL se fuerza a la base de test antes de importar la aplicación.
"""

import os

DATABASE_URL_TEST = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://colonia:colonia_demo_cambiar@postgres:5432/colonia_test",
)
os.environ["DATABASE_URL"] = DATABASE_URL_TEST

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import Base, engine
from app.core.security import CurrentUser, get_current_user
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def esquema():
    url = str(engine.url)

    if "colonia_test" not in url:
        pytest.exit(
            f"Los tests apuntan a una base que no es de test: {url}",
            returncode=1,
        )

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    yield


@pytest.fixture(autouse=True)
def base_limpia():
    with engine.begin() as conexion:
        conexion.execute(
            text(
                "TRUNCATE TABLE inscripciones, turnos, periodos_inscripcion, "
                "configuracion_temporadas RESTART IDENTITY CASCADE"
            )
        )

    yield

    app.dependency_overrides.clear()


@pytest.fixture
def cliente():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def autenticar(cliente):
    def _autenticar(
        *roles: str,
        sub: str = "usuario-de-test",
        email: str | None = None,
    ) -> TestClient:
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            sub=sub,
            username=sub,
            roles=set(roles),
            email=email,
        )
        return cliente

    return _autenticar
