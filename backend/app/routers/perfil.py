from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timedelta, timezone
import math

from app.core.deps import get_db, get_usuario_actual
from app.core.images import safe_unlink_upload, save_upload
from app.modelos.modelos import User, Suscripcion, Plan
from app.esquemas.panel import PerfilOut, PerfilUpdate, PlanActualOut


router = APIRouter(prefix="/perfil", tags=["perfil"])

MAX_BYTES = 2 * 1024 * 1024
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
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    if archivo.content_type not in ALLOWED:
        raise HTTPException(400, "Formato inválido (JPG/PNG/WEBP/AVIF)")

    data = await archivo.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Archivo muy pesado (max 2MB)")

    ext = ALLOWED[archivo.content_type]
    name = f"{uuid.uuid4().hex}{ext}"

    key = f"perfiles/{u.id}/{name}"
    url = save_upload(data, archivo.content_type, key)

    if u.avatar_url:
        safe_unlink_upload(u.avatar_url)
    u.avatar_url = url
    db.add(u)
    db.commit()
    db.refresh(u)

    return {"avatar_url": u.avatar_url}

@router.get("/plan", response_model=PlanActualOut)
def mi_plan(db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    now = datetime.now(timezone.utc)

    fila = (
        db.query(Suscripcion, Plan)
        .join(Plan, Plan.id == Suscripcion.plan_id)
        .filter(Suscripcion.user_id == u.id)
        .order_by(Suscripcion.inicio.desc())
        .first()
    )

    # si no hay suscripción, devolvemos FREE por código (o id=1 si existe)
    if not fila:
        p = db.query(Plan).filter(Plan.codigo == "free").first() or db.query(Plan).filter(Plan.id == 1).first()
        if not p:
            raise HTTPException(status_code=500, detail="No existe el plan FREE")
        return PlanActualOut(plan_id=p.id, plan_codigo=p.codigo, plan_nombre=p.nombre, estado="activa")

    s, p = fila

    # si estaba en trial y venció, lo bajamos a FREE
    if s.fin and s.fin <= now and s.estado == "activa":
        s.estado = "cancelada"
        db.add(s)

        free = db.query(Plan).filter(Plan.codigo == "free").first() or db.query(Plan).filter(Plan.id == 1).first()
        if not free:
            raise HTTPException(status_code=500, detail="No existe el plan FREE")

        nuevo = Suscripcion(
            user_id=u.id,
            plan_id=free.id,
            estado="activa",
            inicio=now,
        )
        db.add(nuevo)

        db.commit()
        db.refresh(nuevo)

        return PlanActualOut(
            plan_id=free.id,
            plan_codigo=free.codigo,
            plan_nombre=free.nombre,
            estado=nuevo.estado,
            inicio=nuevo.inicio,
            fin=nuevo.fin,
        )

    dias = None
    if s.fin:
        dias = max(0, math.ceil((s.fin - now).total_seconds() / 86400))

    return PlanActualOut(
        plan_id=p.id,
        plan_codigo=p.codigo,
        plan_nombre=p.nombre,
        estado=s.estado,
        inicio=s.inicio,
        fin=s.fin,
        dias_restantes=dias,
    )

@router.post("/plan/activar-pro-trial", response_model=PlanActualOut)
def activar_pro_trial(db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    if u.role != "propietario":
        raise HTTPException(status_code=403, detail="Solo propietarios pueden activar PRO")

    now = datetime.now(timezone.utc)

    # buscamos el plan PRO por código (recomendado) o por id=2 como fallback
    pro = db.query(Plan).filter(Plan.codigo == "pro").first() or db.query(Plan).filter(Plan.id == 2).first()
    if not pro:
        raise HTTPException(status_code=500, detail="No existe el plan PRO en la tabla planes")

    # si ya usó trial antes, no permitir repetir
    ya_uso_trial = (
        db.query(Suscripcion)
        .filter(
            Suscripcion.user_id == u.id,
            Suscripcion.plan_id == pro.id,
            Suscripcion.proveedor == "trial",
        )
        .first()
    )
    if ya_uso_trial:
        raise HTTPException(status_code=409, detail="Ya usaste tu prueba PRO")

    # si ya tiene PRO activo (trial o pagado) no creamos otro
    actual = (
        db.query(Suscripcion)
        .filter(Suscripcion.user_id == u.id, Suscripcion.estado == "activa")
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if actual and actual.plan_id == pro.id and (actual.fin is None or actual.fin > now):
        dias = None
        if actual.fin:
            dias = max(0, math.ceil((actual.fin - now).total_seconds() / 86400))
        return PlanActualOut(
            plan_id=pro.id,
            plan_codigo=pro.codigo,
            plan_nombre=pro.nombre,
            estado=actual.estado,
            inicio=actual.inicio,
            fin=actual.fin,
            dias_restantes=dias,
        )

    fin = now + timedelta(days=30)
    s = Suscripcion(
        user_id=u.id,
        plan_id=pro.id,
        estado="activa",
        inicio=now,
        fin=fin,
        proveedor="trial",
        proveedor_ref="pro-30d",
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    dias = max(0, math.ceil((fin - now).total_seconds() / 86400))

    return PlanActualOut(
        plan_id=pro.id,
        plan_codigo=pro.codigo,
        plan_nombre=pro.nombre,
        estado=s.estado,
        inicio=s.inicio,
        fin=s.fin,
        dias_restantes=dias,
    )




