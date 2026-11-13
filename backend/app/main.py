from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.core.errors import registrar_manejadores
from app.api.system import router as system_router
from app.modules.turnos.routes import router as turnos_router
from app.modules.inscripciones.routes import router as inscripciones_router
from app.modules.administracion.routes import router as admin_router
from app.modules.usuarios.routes import router as usuarios_router

settings=get_settings()
# Contract-first (ADR-009): la documentación sale de openapi.yaml, servido por el contenedor swagger-ui.
# FastAPI no publica su propio /docs para que haya una sola fuente de verdad.
app=FastAPI(title=settings.app_name,version="1.0.0",docs_url=None,redoc_url=None,openapi_url=None)
registrar_manejadores(app)
# Swagger UI corre en otro origen (puerto 8082) y llama a la API desde el navegador.
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_origins,allow_methods=["*"],allow_headers=["*"])
for router in (system_router,turnos_router,inscripciones_router,admin_router,usuarios_router): app.include_router(router)

static_dir=Path(__file__).parent/"static"
if static_dir.exists():
    assets=static_dir/"assets"
    if assets.exists(): app.mount("/assets",StaticFiles(directory=assets),name="assets")
    @app.get("/{full_path:path}",include_in_schema=False)
    def spa(full_path:str):
        if full_path.startswith("api/"): raise HTTPException(status_code=404)
        candidate=static_dir/full_path
        if full_path and candidate.is_file(): return FileResponse(candidate)
        return FileResponse(static_dir/"index.html")
