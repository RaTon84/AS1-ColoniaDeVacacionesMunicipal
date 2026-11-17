from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Colonia de Vacaciones 6A"
    environment: str = "dev"
    database_url: str = "postgresql+psycopg://colonia:colonia@postgres:5432/colonia"
    padron_base_url: str = "http://wiremock:8080"
    padron_timeout_seconds: float = 3.0
    temporada: int = 2027
    # Datos de demostración en una instalación nueva: un turno casi completo (ver app/seed_demo.py).
    seed_demo: bool = False
    keycloak_issuer_url: str = "http://localhost:8080/realms/colonia"
    keycloak_internal_url: str = "http://keycloak:8080/realms/colonia"
    keycloak_client_id: str = "colonia-spa"
    keycloak_audience: str = "colonia-api"
    # Cliente de servicio con el que la app administra las cuentas del personal (API de administración de Keycloak).
    keycloak_admin_client_id: str = "colonia-admin-api"
    keycloak_admin_client_secret: str = "colonia_admin_demo_cambiar"
    auth_enabled: bool = True
    public_app_url: str = "http://localhost:8000"
    keycloak_public_url: str = "http://localhost:8080"
    cors_origins: list[str] = ["http://localhost:8082"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
