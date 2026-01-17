from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from sqlalchemy.orm import Session
from pathlib import Path
import uuid

from app.core.deps import get_db, get_usuario_actual
from app.modelos.modelos import User, Suscripcion, Plan
from app.esquemas.panel import PerfilOut, PerfilUpdate, PlanActualOut


router = APIRouter(prefix="/perfil", tags=["perfil"])

MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
}

@router.get("/me", response_model=PerfilOut)
def me(u: User = Depends(get_usuario_actual)):
    return u

@router.put("/me", response_model=PerfilOut)
def actualizar(payload: PerfilUpdate, db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    if payload.jersey_number is not None and (payload.jersey_number < 0 or payload.jersey_number > 99):
        raise HTTPException(400, "jersey_number debe estar entre 0 y 99")

    u.first_name = payload.first_name
    u.last_name = payload.last_name
    u.phone = payload.phone
    u.business_name = payload.business_name
    u.player_position = payload.player_position
    u.jersey_number = payload.jersey_number

    db.add(u)
    db.commit()
    db.refresh(u)
    return u

@router.post("/me/avatar")
async def subir_avatar(
    request: Request,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    if archivo.content_type not in ALLOWED:
        raise HTTPException(400, "Formato inválido (JPG/PNG/WEBP/AVIF)")

    data = await archivo.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Archivo muy pesado (máx 5MB)")

    ext = ALLOWED[archivo.content_type]
    name = f"{uuid.uuid4().hex}{ext}"

    folder = Path("uploads") / "perfiles" / str(u.id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(data)

    base = str(request.base_url).rstrip("/")
    url = f"{base}/static/perfiles/{u.id}/{name}"

    u.avatar_url = url
    db.add(u)
    db.commit()
    db.refresh(u)

    return {"avatar_url": u.avatar_url}

@router.get("/plan", response_model=PlanActualOut)
def mi_plan(db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    fila = (
        db.query(Suscripcion, Plan)
        .join(Plan, Plan.id == Suscripcion.plan_id)
        .filter(Suscripcion.user_id == u.id)
        .order_by(Suscripcion.inicio.desc())
        .first()
    )

    # Si por alguna razón no hay suscripción, caemos al FREE (id=1)
    if not fila:
        p = db.query(Plan).filter(Plan.id == 1).first()
        if not p:
            raise HTTPException(status_code=500, detail="No existe el plan FREE (id=1)")
        return PlanActualOut(plan_id=p.id, plan_codigo=p.codigo, plan_nombre=p.nombre, estado="activa", inicio=None)

    s, p = fila
    return PlanActualOut(
        plan_id=p.id,
        plan_codigo=p.codigo,
        plan_nombre=p.nombre,
        estado=s.estado,
        inicio=s.inicio,
    )
