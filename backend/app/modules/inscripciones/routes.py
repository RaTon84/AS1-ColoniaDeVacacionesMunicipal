from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_roles
from app.modules.inscripciones.repository import InscripcionRepository
from app.modules.inscripciones.schemas import InscripcionCreate, InscripcionOut
from app.modules.inscripciones.service import InscripcionService

router=APIRouter(prefix="/api/v1",tags=["Inscripciones"])
settings=get_settings(); repo=InscripcionRepository(); service=InscripcionService()

@router.post("/inscripciones",response_model=InscripcionOut,status_code=201)
def crear(payload:InscripcionCreate,response:Response,db:Session=Depends(get_db),user:CurrentUser=Depends(require_roles("tutor","administrativo","administrador_sistema"))):
    nueva=service.crear(db,payload,user.sub)
    response.headers["Location"]=f"/api/v1/inscripciones/{nueva.id}"   # 201 + Location (Clase 9)
    return nueva

@router.get("/inscripciones/{id}",response_model=InscripcionOut)
def obtener(id:int,db:Session=Depends(get_db),user:CurrentUser=Depends(get_current_user)):
    ve_todas=bool(user.roles & {"administrativo","administrador_sistema"})
    return service.obtener(db,id,user.sub,ve_todas)

@router.get("/mis-inscripciones",response_model=list[InscripcionOut])
def mias(db:Session=Depends(get_db),user:CurrentUser=Depends(get_current_user)):
    return repo.list_by_user(db,user.sub,settings.temporada)
