import httpx
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, require_roles
from app.modules.administracion.temporadas import obtener_configuracion_activa

router=APIRouter(prefix="/api/v1",tags=["Sistema"])
settings=get_settings()

def _probe(db: Session):
    services={"api":"ok","database":"ok","keycloak":"ok","padron":"ok"}
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        services["database"]="error"
    try:
        r=httpx.get(f"{settings.padron_base_url}/__admin/",timeout=1.5)
        if r.status_code>=500: services["padron"]="error"
    except Exception:
        services["padron"]="error"
    try:
        r=httpx.get(f"{settings.keycloak_internal_url}/.well-known/openid-configuration",timeout=1.5)
        if r.status_code>=500: services["keycloak"]="error"
    except Exception:
        services["keycloak"]="error"
    return services

@router.get("/health")
def health(response:Response,db:Session=Depends(get_db)):
    services=_probe(db)
    ok=all(v=="ok" for v in services.values())
    if not ok: response.status_code=503   # issue #5: si falla un componente, el sistema no está sano
    return {"status":"ok" if ok else "degraded",**services}

@router.get("/system-info")
def system_info(db:Session=Depends(get_db),_:CurrentUser=Depends(require_roles("administrador_sistema"))):
    services=_probe(db)
    return {
        "app":settings.app_name,
        "environment":settings.environment,
        "temporada":obtener_configuracion_activa(db).temporada,
        "version":"1.1.0",
        "services":services,
    }

@router.get("/config")
def public_config():
    return {"keycloakUrl":settings.keycloak_public_url,"realm":"colonia","clientId":settings.keycloak_client_id,"apiBase":"/api/v1"}
