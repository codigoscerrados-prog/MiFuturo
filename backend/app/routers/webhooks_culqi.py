from datetime import datetime, timezone, timedelta
import base64
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db
from app.modelos.modelos import Suscripcion, User
from app.utils.time import now_peru

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/culqi", tags=["webhooks"])


def _require_basic_auth(request: Request) -> None:
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("basic "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        b64 = auth.split(" ", 1)[1].strip()
        raw = base64.b64decode(b64).decode("utf-8")
        user, pwd = raw.split(":", 1)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if user != settings.CULQI_WEBHOOK_USER or pwd != settings.CULQI_WEBHOOK_PASS:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _find_subscription_id(value: object) -> str | None:
    if isinstance(value, dict):
        for k, v in value.items():
            if k in {"subscription_id", "subscriptionId", "subsId"} and isinstance(v, str) and v.startswith("sxn_"):
                return v
            if k == "id" and isinstance(v, str) and v.startswith("sxn_"):
                return v
            found = _find_subscription_id(v)
            if found:
                return found
    elif isinstance(value, list):
        for item in value:
            found = _find_subscription_id(item)
            if found:
                return found
    return None


def _extract_subscription_id(payload: dict) -> str | None:
    if not payload:
        return None
    # Algunos webhooks envían data como string JSON
    data = payload.get("data")
    if isinstance(data, str):
        try:
            import json
            parsed = json.loads(data)
            found = _find_subscription_id(parsed)
            if found:
                return found
        except Exception:
            pass
    # Otros envían message.object con subsId
    message = payload.get("message")
    if isinstance(message, dict):
        found = _find_subscription_id(message)
        if found:
            return found
    found = _find_subscription_id(payload)
    if found:
        return found
    data = payload.get("data") or {}
    if isinstance(data, dict):
        return data.get("subscription_id") or data.get("id")
    return payload.get("subscription_id")


def _find_sxn_id(value: object) -> str | None:
    if isinstance(value, dict):
        for k, v in value.items():
            if k in {"sxn_id", "subscription_id", "subsId"} and isinstance(v, str) and v.startswith("sxn_"):
                return v
            found = _find_sxn_id(v)
            if found:
                return found
    elif isinstance(value, list):
        for item in value:
            found = _find_sxn_id(item)
            if found:
                return found
    return None


def _extract_sxn_id(payload: dict) -> str | None:
    if not payload:
        return None
    data = payload.get("data")
    if isinstance(data, str):
        try:
            import json
            parsed = json.loads(data)
            found = _find_sxn_id(parsed)
            if found:
                return found
        except Exception:
            pass
    message = payload.get("message")
    if isinstance(message, dict):
        found = _find_sxn_id(message)
        if found:
            return found
    found = _find_sxn_id(payload)
    if found:
        return found
    if isinstance(data, dict):
        return data.get("sxn_id")
    return None


def _extract_email(payload: dict) -> str | None:
    def _find_email(v: object) -> str | None:
        if isinstance(v, dict):
            for k, val in v.items():
                if k.lower() == "email" and isinstance(val, str) and "@" in val:
                    return val.strip().lower()
                found = _find_email(val)
                if found:
                    return found
        elif isinstance(v, list):
            for item in v:
                found = _find_email(item)
                if found:
                    return found
        return None

    return _find_email(payload)


def _extend_fin(s: Suscripcion, now: datetime) -> None:
    if s.fin and s.fin > now:
        s.fin = s.fin + timedelta(days=30)
    else:
        s.fin = now + timedelta(days=30)


@router.post("")
@router.post("/")
async def culqi_webhook(request: Request, db: Session = Depends(get_db)):
    _require_basic_auth(request)
    payload = await request.json()

    sub_id = _extract_subscription_id(payload)
    event_type = (payload.get("type") or payload.get("action") or "").lower()
    status = str(payload.get("status") or payload.get("result") or "").lower()
    if not event_type and payload.get("object") == "charge":
        event_type = "charge.creation.succeeded"

    # Si es evento de cargo, usar sxn_id para ubicar la suscripción
    if not sub_id and "charge" in event_type:
        sub_id = _extract_sxn_id(payload)

    if not sub_id:
        logger.warning("Webhook sin subscription id: %s", payload)
        return {"ok": True}

    sus = db.query(Suscripcion).filter(Suscripcion.proveedor_ref == sub_id).first() if sub_id else None
    if not sus:
        # fallback: buscar por email si es evento de cargo
        email = _extract_email(payload)
        if email:
            u = db.query(User).filter(User.email == email).first()
            if u:
                sus = (
                    db.query(Suscripcion)
                    .filter(Suscripcion.user_id == u.id, Suscripcion.proveedor == "culqi")
                    .order_by(Suscripcion.inicio.desc())
                    .first()
                )
    if not sus:
        logger.warning("Webhook sin suscripcion local: %s", sub_id)
        return {"ok": True}

    now = now_peru()

    if status == "failed":
        sus.estado = "rechazada"
        if not sus.fin or sus.fin > now:
            sus.fin = now
        db.add(sus)
        db.commit()
        return {"ok": True}

    # Si es charge.succeeded, activar inmediatamente
    if "charge" in event_type and "succeeded" in event_type:
        outcome = payload.get("outcome") or {}
        paid = payload.get("paid")
        outcome_type = str(outcome.get("type") or "").lower()
        if paid is False and outcome_type not in {"venta_autorizada", "venta_aprobada", "venta_exitosa"}:
            return {"ok": True}
        _extend_fin(sus, now)
        sus.estado = "activa"
        if sus.user_id:
            otros = (
                db.query(Suscripcion)
                .filter(Suscripcion.user_id == sus.user_id, Suscripcion.estado == "activa", Suscripcion.id != sus.id)
                .all()
            )
            for o in otros:
                o.estado = "cancelada"
                if not o.fin or o.fin > now:
                    o.fin = now
                db.add(o)
        db.add(sus)
        db.commit()
        return {"ok": True}

    if "cancel" in event_type:
        sus.estado = "cancelada"
        if not sus.fin or sus.fin > now:
            sus.fin = now
        db.add(sus)
        db.commit()
        return {"ok": True}

    # Si es creation.succeeded, solo dejamos pendiente (no activamos hasta primer cobro)
    if "creation" in event_type:
        sus.estado = "pendiente"
        db.add(sus)
        db.commit()
        return {"ok": True}

    # Para update.succeeded, extender 30 dias y activar
    _extend_fin(sus, now)
    sus.estado = "activa"

    # Cancelar otros planes activos del mismo usuario (ej: FREE)
    if sus.user_id:
        otros = (
            db.query(Suscripcion)
            .filter(Suscripcion.user_id == sus.user_id, Suscripcion.estado == "activa", Suscripcion.id != sus.id)
            .all()
        )
        for o in otros:
            o.estado = "cancelada"
            if not o.fin or o.fin > now:
                o.fin = now
            db.add(o)
    db.add(sus)
    db.commit()

    return {"ok": True}


@router.get("/ping")
def culqi_webhook_ping(request: Request):
    _require_basic_auth(request)
    return {"ok": True}
