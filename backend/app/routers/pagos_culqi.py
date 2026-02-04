import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_usuario_actual
from app.modelos.modelos import Plan, Suscripcion, User

try:
    from culqi2.client import Culqi
except Exception:  # pragma: no cover - si la dependencia no estÃ¡ instalada
    Culqi = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments/culqi", tags=["pagos"])


class CulqiSubscribeIn(BaseModel):
    token_id: str = Field(..., min_length=10)
    email: EmailStr | None = None
    phone_number: str | None = None


class CulqiSubscribeOut(BaseModel):
    suscripcion_id: int
    estado: str
    proveedor_ref: str
    plan_id: int


def _require_culqi() -> None:
    if Culqi is None:
        raise HTTPException(status_code=500, detail="Falta instalar la dependencia culqi en el backend")


def _culqi_client() -> "Culqi":
    _require_culqi()
    if not settings.CULQI_PUBLIC_KEY or not settings.CULQI_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Faltan llaves de Culqi en el backend")
    return Culqi(settings.CULQI_PUBLIC_KEY, settings.CULQI_SECRET_KEY)


def _culqi_call(fn, *, data: dict):
    try:
        resp = fn(data=data)
    except Exception as exc:
        logger.exception("Culqi error")
        raise HTTPException(status_code=502, detail=f"Error al comunicarse con Culqi: {exc}")

    if not isinstance(resp, dict) or "data" not in resp:
        raise HTTPException(status_code=502, detail="Respuesta inesperada de Culqi")

    payload = resp.get("data") or {}
    if isinstance(payload, dict) and payload.get("object") == "error":
        msg = payload.get("user_message") or payload.get("merchant_message") or "Error en Culqi"
        raise HTTPException(status_code=502, detail=msg)

    return payload


def _get_pro_plan(db: Session) -> Plan:
    plan = db.query(Plan).filter(Plan.codigo == "pro").first() or db.query(Plan).filter(Plan.id == 2).first()
    if not plan:
        raise HTTPException(status_code=500, detail="No existe el plan PRO en la tabla planes")
    return plan


def _has_active_pro(db: Session, user_id: int, pro_id: int) -> bool:
    now = datetime.now(timezone.utc)
    actual = (
        db.query(Suscripcion)
        .filter(Suscripcion.user_id == user_id, Suscripcion.estado == "activa")
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if not actual:
        return False
    if actual.plan_id != pro_id:
        return False
    return actual.fin is None or actual.fin > now


@router.post("/subscribe", response_model=CulqiSubscribeOut)
def subscribe(
    payload: CulqiSubscribeIn,
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    if u.role != "propietario":
        raise HTTPException(status_code=403, detail="Solo propietarios pueden activar PRO")

    if not settings.CULQI_PLAN_ID:
        raise HTTPException(
            status_code=503,
            detail="Suscripción no disponible aún (plan de Culqi no configurado).",
        )

    pro = _get_pro_plan(db)

    if _has_active_pro(db, u.id, pro.id):
        raise HTTPException(status_code=409, detail="Ya tienes PRO activo")

    culqi = _culqi_client()

    customer_data = {
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": payload.email or u.email,
        "country_code": "PE",
    }
    phone = (payload.phone_number or u.phone or "").strip()
    if phone:
        customer_data["phone_number"] = phone

    customer = _culqi_call(culqi.customer.create, data=customer_data)
    customer_id = customer.get("id")
    if not customer_id:
        raise HTTPException(status_code=502, detail="Culqi no devolviÃ³ customer_id")

    card = _culqi_call(
        culqi.card.create,
        data={
            "customer_id": customer_id,
            "token_id": payload.token_id,
        },
    )
    card_id = card.get("id")
    if not card_id:
        raise HTTPException(status_code=502, detail="Culqi no devolviÃ³ card_id")

    subscription = _culqi_call(
        culqi.subscription.create,
        data={
            "card_id": card_id,
            "plan_id": settings.CULQI_PLAN_ID,
            "tyc": True,
        },
    )
    subscription_id = subscription.get("id")
    if not subscription_id:
        raise HTTPException(status_code=502, detail="Culqi no devolviÃ³ subscription_id")

    now = datetime.now(timezone.utc)
    s = Suscripcion(
        user_id=u.id,
        plan_id=pro.id,
        estado="activa",
        inicio=now,
        proveedor="culqi",
        proveedor_ref=subscription_id,
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    return CulqiSubscribeOut(
        suscripcion_id=s.id,
        estado=s.estado,
        proveedor_ref=s.proveedor_ref or "",
        plan_id=s.plan_id,
    )
