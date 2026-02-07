import logging
from datetime import datetime, timezone, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
import requests
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.crypto import decrypt_secret
from app.core.deps import get_db, get_usuario_actual
from app.modelos.modelos import Cancha, Complejo, PaymentIntegration, Plan, Reserva, Suscripcion, User

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
    device_id: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    authentication_3ds: dict | None = None


class CulqiChargeOut(BaseModel):
    charge_id: str
    reserva_id: int
    total_amount: float


class CulqiProChargeIn(BaseModel):
    token_id: str = Field(..., min_length=10)
    email: EmailStr
    device_id: str | None = None
    authentication_3ds: dict | None = None


class CulqiProChargeOut(BaseModel):
    charge_id: str
    suscripcion_id: int
    inicio: datetime
    fin: datetime | None


class CulqiSubscriptionOut(BaseModel):
    subscription_id: str
    status: str | None = None
    email: EmailStr | None = None
    card_id: str | None = None
    plan_id: str | None = None
    customer_id: str | None = None


class CulqiSubscriptionCardIn(BaseModel):
    token_id: str = Field(..., min_length=10)


class CulqiSubscriptionEmailIn(BaseModel):
    email: EmailStr


CULQI_API_BASE = "https://api.culqi.com"

SENSITIVE_KEYS = {"token_id", "source_id", "card_number", "cvv", "password"}


def _redact(data: dict) -> dict:
    def _mask(value: str) -> str:
        if not value:
            return value
        if len(value) <= 6:
            return "***"
        return f"{value[:3]}***{value[-3:]}"

    redacted = {}
    for k, v in (data or {}).items():
        if k in SENSITIVE_KEYS and isinstance(v, str):
            redacted[k] = _mask(v)
        elif isinstance(v, dict):
            redacted[k] = _redact(v)
        else:
            redacted[k] = v
    return redacted


def _require_secret_key(secret_key: str | None, *, label: str) -> str:
    if not secret_key:
        raise HTTPException(status_code=500, detail=f"Falta llave secreta de Culqi ({label})")
    return secret_key


def _culqi_request_raw(secret_key: str, method: str, path: str, data: dict | None = None) -> tuple[int, dict]:
    url = f"{CULQI_API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }
    safe_data = _redact(data or {})
    try:
        resp = requests.request(method, url, json=data, headers=headers, timeout=20)
    except Exception as exc:
        logger.exception("Culqi request error (method=%s, path=%s, data=%s)", method, path, safe_data)
        raise HTTPException(status_code=502, detail=f"Error al comunicarse con Culqi: {exc}")

    try:
        payload = resp.json()
    except Exception:
        logger.error("Culqi response no JSON (status=%s): %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Respuesta inesperada de Culqi")

    return resp.status_code, payload


def _culqi_post_raw(secret_key: str, path: str, data: dict) -> tuple[int, dict]:
    return _culqi_request_raw(secret_key, "POST", path, data)


def _culqi_get(secret_key: str, path: str) -> dict:
    status, payload = _culqi_request_raw(secret_key, "GET", path, None)
    if status >= 400 or payload.get("object") == "error":
        msg = payload.get("user_message") or payload.get("merchant_message") or payload.get("message") or "Error en Culqi"
        logger.error("Culqi error response (status=%s, path=%s): %s", status, path, payload)
        raise HTTPException(status_code=502, detail=msg)
    return payload


def _culqi_get_customer_by_email(secret_key: str, email: str) -> str | None:
    from urllib.parse import quote

    if not email:
        return None
    data = _culqi_get(secret_key, f"/v2/customers?email={quote(email)}")
    items = data.get("data") if isinstance(data, dict) else None
    if isinstance(items, list) and items:
        item = items[0] or {}
        return item.get("id")
    return None


def _culqi_patch(secret_key: str, path: str, data: dict) -> dict:
    status, payload = _culqi_request_raw(secret_key, "PATCH", path, data)
    if status >= 400 or payload.get("object") == "error":
        msg = payload.get("user_message") or payload.get("merchant_message") or payload.get("message") or "Error en Culqi"
        logger.error("Culqi error response (status=%s, path=%s, data=%s): %s", status, path, _redact(data), payload)
        raise HTTPException(status_code=502, detail=msg)
    return payload


def _culqi_post(secret_key: str, path: str, data: dict) -> dict:
    status, payload = _culqi_post_raw(secret_key, path, data)
    if status >= 400 or payload.get("object") == "error":
        msg = payload.get("user_message") or payload.get("merchant_message") or payload.get("message") or "Error en Culqi"
        logger.error("Culqi error response (status=%s, path=%s, data=%s): %s", status, path, _redact(data), payload)
        raise HTTPException(status_code=502, detail=msg)
    return payload


def _build_antifraud_details(device_id: str | None, *, email: str, first_name: str | None, last_name: str | None, phone: str | None) -> dict | None:
    if not device_id:
        return None
    details = {
        "device_finger_print_id": device_id,
        "email": email,
    }
    if first_name:
        details["first_name"] = first_name
    if last_name:
        details["last_name"] = last_name
    if phone:
        details["phone_number"] = phone
    return details


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


def _get_active_culqi_subscription(db: Session, user_id: int) -> Suscripcion:
    fila = (
        db.query(Suscripcion)
        .filter(Suscripcion.user_id == user_id, Suscripcion.estado == "activa", Suscripcion.proveedor == "culqi")
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if not fila or not fila.proveedor_ref:
        raise HTTPException(status_code=404, detail="No hay suscripci?n Culqi activa")
    return fila


@router.post("/subscribe", response_model=CulqiSubscribeOut)
def subscribe(
    payload: CulqiSubscribeIn,
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    try:
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

        secret_key = _require_secret_key(settings.CULQI_SECRET_KEY, label="backend")

        customer_email = (payload.email or u.email or "").strip()
        if not customer_email:
            raise HTTPException(status_code=400, detail="Falta email para crear customer en Culqi")

        customer_data = {
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": customer_email,
            "country_code": "PE",
        }
        if not customer_data.get("address"):
            customer_data["address"] = "Lima, Peru"
        if not customer_data.get("address_city"):
            customer_data["address_city"] = "Lima"
        if not customer_data.get("address_country"):
            customer_data["address_country"] = "PE"
        phone = (payload.phone_number or u.phone or "").strip()
        if phone:
            customer_data["phone_number"] = phone

        customer_id = _culqi_get_customer_by_email(secret_key, customer_email)
        if not customer_id:
            customer = _culqi_post(secret_key, "/v2/customers", customer_data)
            customer_id = customer.get("id")
        if not customer_id:
            raise HTTPException(status_code=502, detail="Culqi no devolvió customer_id")

        card = _culqi_post(
            secret_key,
            "/v2/cards",
            {
                "customer_id": customer_id,
                "token_id": payload.token_id,
            },
        )
        card_id = card.get("id")
        if not card_id:
            raise HTTPException(status_code=502, detail="Culqi no devolvió card_id")

        subscription = _culqi_post(
            secret_key,
            "/v2/recurrent/subscriptions/create",
            {
                "card_id": card_id,
                "plan_id": settings.CULQI_PLAN_ID,
                "tyc": True,
            },
        )
        subscription_id = subscription.get("id")
        if not subscription_id:
            raise HTTPException(status_code=502, detail="Culqi no devolvió subscription_id")

        now = datetime.now(timezone.utc)
        fin = now + timedelta(days=30)
        s = Suscripcion(
            user_id=u.id,
            plan_id=pro.id,
            estado="activa",
            inicio=now,
            fin=fin,
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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error interno en subscribe")
        raise HTTPException(status_code=500, detail=f"Error interno en suscripción: {exc}")


@router.post("/charge", response_model=CulqiChargeOut)
def charge(payload: CulqiChargeIn, db: Session = Depends(get_db)):
    try:
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

        charge_body = {
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
        }
        antifraud = _build_antifraud_details(
            payload.device_id,
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
        )
        if antifraud:
            charge_body["antifraud_details"] = antifraud
        if payload.authentication_3ds:
            charge_body["authentication_3DS"] = payload.authentication_3ds

        status, charge = _culqi_post_raw(
            _require_secret_key(sk, label="propietario"),
            "/v2/charges",
            charge_body,
        )
        if status == 200 and charge.get("action_code") == "REVIEW":
            raise HTTPException(status_code=409, detail="3DS_REQUIRED")
        if status >= 400 or charge.get("object") == "error":
            msg = charge.get("user_message") or charge.get("merchant_message") or charge.get("message") or "Error en Culqi"
            raise HTTPException(status_code=502, detail=msg)

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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error interno en charge")
        raise HTTPException(status_code=500, detail=f"Error interno en cobro: {exc}")

@router.post("/charge-pro", response_model=CulqiProChargeOut)
def charge_pro(payload: CulqiProChargeIn, db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    try:
        if u.role != "propietario":
            raise HTTPException(status_code=403, detail="Solo propietarios pueden pagar PRO")

        pro = _get_pro_plan(db)

        secret_key = _require_secret_key(settings.CULQI_SECRET_KEY, label="backend")
        charge_body = {
            "amount": 5000,
            "currency_code": "PEN",
            "email": payload.email,
            "source_id": payload.token_id,
            "description": "Pago mensual PRO (manual)",
            "metadata": {"user_id": u.id, "plan": "pro"},
        }
        antifraud = _build_antifraud_details(
            payload.device_id,
            email=payload.email,
            first_name=u.first_name,
            last_name=u.last_name,
            phone=u.phone,
        )
        if antifraud:
            charge_body["antifraud_details"] = antifraud
        if payload.authentication_3ds:
            charge_body["authentication_3DS"] = payload.authentication_3ds

        status, charge = _culqi_post_raw(
            secret_key,
            "/v2/charges",
            charge_body,
        )
        if status == 200 and charge.get("action_code") == "REVIEW":
            raise HTTPException(status_code=409, detail="3DS_REQUIRED")
        if status >= 400 or charge.get("object") == "error":
            msg = charge.get("user_message") or charge.get("merchant_message") or charge.get("message") or "Error en Culqi"
            raise HTTPException(status_code=502, detail=msg)

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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error interno en charge_pro")
        raise HTTPException(status_code=500, detail=f"Error interno en pago PRO: {exc}")



@router.get("/subscription", response_model=CulqiSubscriptionOut)
def subscription_status(db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    s = _get_active_culqi_subscription(db, u.id)
    secret_key = _require_secret_key(settings.CULQI_SECRET_KEY, label="backend")
    data = _culqi_get(secret_key, f"/v2/recurrent/subscriptions/{s.proveedor_ref}")

    customer = data.get("customer") or {}
    return CulqiSubscriptionOut(
        subscription_id=s.proveedor_ref,
        status=str(data.get("status")) if data.get("status") is not None else None,
        email=customer.get("email"),
        card_id=data.get("active_card") or data.get("card_id"),
        plan_id=(data.get("plan") or {}).get("plan_id") or data.get("plan_id"),
        customer_id=customer.get("id") or data.get("customer_id"),
    )


@router.put("/subscription/card")
def update_subscription_card(payload: CulqiSubscriptionCardIn, db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    s = _get_active_culqi_subscription(db, u.id)
    secret_key = _require_secret_key(settings.CULQI_SECRET_KEY, label="backend")

    sub = _culqi_get(secret_key, f"/v2/recurrent/subscriptions/{s.proveedor_ref}")
    customer = sub.get("customer") or {}
    customer_id = customer.get("id") or sub.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=502, detail="Culqi no devolvi? customer_id")

    card = _culqi_post(secret_key, "/v2/cards", {"customer_id": customer_id, "token_id": payload.token_id})
    card_id = card.get("id")
    if not card_id:
        raise HTTPException(status_code=502, detail="Culqi no devolvi? card_id")

    _culqi_patch(secret_key, f"/v2/recurrent/subscriptions/{s.proveedor_ref}", {"card_id": card_id})
    return {"ok": True}


@router.put("/subscription/email")
def update_subscription_email(payload: CulqiSubscriptionEmailIn, db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    s = _get_active_culqi_subscription(db, u.id)
    secret_key = _require_secret_key(settings.CULQI_SECRET_KEY, label="backend")

    sub = _culqi_get(secret_key, f"/v2/recurrent/subscriptions/{s.proveedor_ref}")
    customer = sub.get("customer") or {}
    customer_id = customer.get("id") or sub.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=502, detail="Culqi no devolvi? customer_id")

    _culqi_patch(secret_key, f"/v2/customers/{customer_id}", {"email": payload.email})
    return {"ok": True}
