from datetime import datetime, timezone, timedelta
import base64
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db
from app.modelos.modelos import Suscripcion
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


def _extract_subscription_id(payload: dict) -> str | None:
    if not payload:
        return None
    data = payload.get("data") or {}
    if isinstance(data, dict):
        return data.get("id") or data.get("subscription_id")
    return payload.get("id") or payload.get("subscription_id")


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
    event_type = (payload.get("type") or "").lower()
    status = str(payload.get("status") or payload.get("result") or "").lower()

    if not sub_id:
        logger.warning("Webhook sin subscription id: %s", payload)
        return {"ok": True}

    sus = db.query(Suscripcion).filter(Suscripcion.proveedor_ref == sub_id).first()
    if not sus:
        logger.warning("Webhook sin suscripcion local: %s", sub_id)
        return {"ok": True}

    now = now_peru()

    if "cancel" in event_type or status == "failed":
        sus.estado = "cancelada"
        if not sus.fin or sus.fin > now:
            sus.fin = now
        db.add(sus)
        db.commit()
        return {"ok": True}

    # Por defecto, si es update/creation succeeded, extender 30 dias
    _extend_fin(sus, now)
    sus.estado = "activa"
    db.add(sus)
    db.commit()

    return {"ok": True}


@router.get("/ping")
def culqi_webhook_ping(request: Request):
    _require_basic_auth(request)
    return {"ok": True}
