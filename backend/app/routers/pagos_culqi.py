import logging
from datetime import datetime, timezone, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.crypto import decrypt_secret
from app.core.deps import get_db, get_usuario_actual
from app.modelos.modelos import Cancha, Complejo, PaymentIntegration, Plan, Reserva, Suscripcion, User

try:
    from culqi2.client import Culqi
except Exception:  # pragma: no cover - si la dependencia no est? instalada
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


class CulqiChargeIn(BaseModel):
    token_id: str = Field(..., min_length=10)
    cancha_id: int
    start_at: datetime
    end_at: datetime
    email: EmailStr


class CulqiChargeOut(BaseModel):
    charge_id: str
    reserva_id: int
    total_amount: float


class CulqiProChargeIn(BaseModel):
    token_id: str = Field(..., min_length=10)
    email: EmailStr


class CulqiProChargeOut(BaseModel):
    charge_id: str
    suscripcion_id: int
    inicio: datetime
    fin: datetime | None


def _require_culqi() -> None:
    if Culqi is None:
        raise HTTPException(status_code=500, detail="Falta instalar la dependencia culqi en el backend")


def _culqi_client() -> "Culqi":
    _require_culqi()
    if not settings.CULQI_PUBLIC_KEY or not settings.CULQI_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Faltan llaves de Culqi en el backend")
    return Culqi(settings.CULQI_PUBLIC_KEY, settings.CULQI_SECRET_KEY)


def _culqi_client_custom(public_key: str, secret_key: str) -> "Culqi":
    _require_culqi()
    if not public_key or not secret_key:
        raise HTTPException(status_code=500, detail="Faltan llaves de Culqi del propietario")
    return Culqi(public_key, secret_key)


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


def _extend_or_create_pro(db: Session, user_id: int, pro_id: int) -> Suscripcion:
    now = datetime.now(timezone.utc)
    actual = (
        db.query(Suscripcion)
        .filter(Suscripcion.user_id == user_id, Suscripcion.plan_id == pro_id, Suscripcion.estado == "activa")
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if actual and actual.fin and actual.fin > now:
        actual.fin = actual.fin + timedelta(days=30)
        db.add(actual)
        db.commit()
        db.refresh(actual)
        return actual

    fin = now + timedelta(days=30)
    s = Suscripcion(
        user_id=user_id,
        plan_id=pro_id,
        estado="activa",
        inicio=now,
        fin=fin,
        proveedor="culqi_charge",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


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


def _require_owner_pro(db: Session, owner_id: int) -> None:
    now = datetime.now(timezone.utc)
    fila = (
        db.query(Suscripcion, Plan)
        .join(Plan, Plan.id == Suscripcion.plan_id)
        .filter(
            Suscripcion.user_id == owner_id,
            Suscripcion.estado == "activa",
            or_(Suscripcion.fin.is_(None), Suscripcion.fin > now),
        )
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if not fila:
        raise HTTPException(status_code=403, detail="El propietario no tiene PRO activo")
    _, plan = fila
    if "pro" not in (plan.codigo or "").lower():
        raise HTTPException(status_code=403, detail="El propietario no tiene PRO activo")


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
        raise HTTPException(status_code=502, detail="Culqi no devolvi? customer_id")

    card = _culqi_call(
        culqi.card.create,
        data={
            "customer_id": customer_id,
            "token_id": payload.token_id,
        },
    )
    card_id = card.get("id")
    if not card_id:
        raise HTTPException(status_code=502, detail="Culqi no devolvi? card_id")

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
        raise HTTPException(status_code=502, detail="Culqi no devolvi? subscription_id")

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


@router.post("/charge", response_model=CulqiChargeOut)
def charge(payload: CulqiChargeIn, db: Session = Depends(get_db)):
    cancha = (
        db.query(Cancha)
        .options(joinedload(Cancha.complejo))
        .filter(Cancha.id == payload.cancha_id)
        .first()
    )
    if not cancha:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    owner_id = cancha.owner_id or (cancha.complejo.owner_id if cancha.complejo else None)
    if not owner_id:
        raise HTTPException(status_code=400, detail="Cancha sin propietario")

    _require_owner_pro(db, owner_id)

    integ = db.query(PaymentIntegration).filter(PaymentIntegration.user_id == owner_id).first()
    if not integ or not integ.enabled:
        raise HTTPException(status_code=403, detail="Culqi no activo para este propietario")

    try:
        sk = decrypt_secret(integ.culqi_sk_enc)
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo descifrar culqi_sk")

    if not integ.culqi_pk:
        raise HTTPException(status_code=400, detail="Falta culqi_pk del propietario")

    # validar solape
    solape = (
        db.query(Reserva)
        .filter(
            Reserva.cancha_id == payload.cancha_id,
            Reserva.payment_status != "cancelada",
            Reserva.start_at < payload.end_at,
            Reserva.end_at > payload.start_at,
        )
        .first()
    )
    if solape:
        raise HTTPException(status_code=409, detail="Ya existe una reserva en ese horario.")

    duration_hours = (payload.end_at - payload.start_at).total_seconds() / 3600
    if duration_hours <= 0:
        raise HTTPException(status_code=400, detail="Horario inválido")

    precio_hora = float(cancha.precio_hora or 0)
    if precio_hora <= 0:
        raise HTTPException(status_code=400, detail="Precio inválido")

    total_amount = round(precio_hora * duration_hours, 2)
    amount_cents = int(round(total_amount * 100))
    if amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Monto inválido")

    culqi = _culqi_client_custom(integ.culqi_pk, sk)

    charge = _culqi_call(
        culqi.charge.create,
        data={
            "amount": amount_cents,
            "currency_code": "PEN",
            "email": payload.email,
            "source_id": payload.token_id,
            "description": f"Reserva cancha #{cancha.id}",
            "metadata": {
                "cancha_id": cancha.id,
                "complejo_id": cancha.complejo_id,
                "owner_id": owner_id,
                "start_at": payload.start_at.isoformat(),
                "end_at": payload.end_at.isoformat(),
            },
        },
    )

    charge_id = charge.get("id")
    if not charge_id:
        raise HTTPException(status_code=502, detail="Culqi no devolvió charge_id")

    r = Reserva(
        cancha_id=payload.cancha_id,
        cliente_id=None,
        start_at=payload.start_at,
        end_at=payload.end_at,
        total_amount=total_amount,
        paid_amount=total_amount,
        payment_method="culqi",
        payment_status="pagada",
        payment_ref=charge_id,
        notas="Reserva pagada en línea",
        created_by=None,
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    return CulqiChargeOut(charge_id=charge_id, reserva_id=r.id, total_amount=float(total_amount))


@router.post("/charge-pro", response_model=CulqiProChargeOut)
def charge_pro(payload: CulqiProChargeIn, db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    if u.role != "propietario":
        raise HTTPException(status_code=403, detail="Solo propietarios pueden pagar PRO")

    pro = _get_pro_plan(db)

    # Pago único (mensual manual) con Culqi
    culqi = _culqi_client()
    charge = _culqi_call(
        culqi.charge.create,
        data={
            "amount": 5000,
            "currency_code": "PEN",
            "email": payload.email,
            "source_id": payload.token_id,
            "description": "Pago mensual PRO (manual)",
            "metadata": {"user_id": u.id, "plan": "pro"},
        },
    )

    charge_id = charge.get("id")
    if not charge_id:
        raise HTTPException(status_code=502, detail="Culqi no devolvió charge_id")

    s = _extend_or_create_pro(db, u.id, pro.id)
    s.proveedor_ref = charge_id
    db.add(s)
    db.commit()
    db.refresh(s)

    return CulqiProChargeOut(
        charge_id=charge_id,
        suscripcion_id=s.id,
        inicio=s.inicio,
        fin=s.fin,
    )
