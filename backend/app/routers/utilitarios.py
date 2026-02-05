from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.deps import get_db, get_usuario_actual
from app.modelos.modelos import PaymentIntegration, Plan, Suscripcion, User

router = APIRouter(prefix="/panel/utilitarios", tags=["utilitarios"])


class CulqiConfigOut(BaseModel):
    enabled: bool
    culqi_pk: str | None = None
    sk_set: bool = False


class CulqiConfigIn(BaseModel):
    enabled: bool
    culqi_pk: str | None = Field(default=None)
    culqi_sk: str | None = Field(default=None)


def _require_pro(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    fila = (
        db.query(Suscripcion, Plan)
        .join(Plan, Plan.id == Suscripcion.plan_id)
        .filter(
            Suscripcion.user_id == user_id,
            Suscripcion.estado == "activa",
            or_(Suscripcion.fin.is_(None), Suscripcion.fin > now),
        )
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if not fila:
        raise HTTPException(status_code=403, detail="Solo PRO puede usar utilitarios")
    _, plan = fila
    codigo = (plan.codigo or "").lower()
    if "pro" not in codigo:
        raise HTTPException(status_code=403, detail="Solo PRO puede usar utilitarios")


@router.get("/culqi", response_model=CulqiConfigOut)
def obtener_culqi(db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    if u.role != "propietario":
        raise HTTPException(status_code=403, detail="Solo propietarios")
    _require_pro(db, u.id)

    integ = db.query(PaymentIntegration).filter(PaymentIntegration.user_id == u.id).first()
    if not integ:
        return CulqiConfigOut(enabled=False, culqi_pk=None, sk_set=False)

    return CulqiConfigOut(
        enabled=bool(integ.enabled),
        culqi_pk=integ.culqi_pk,
        sk_set=bool(integ.culqi_sk_enc),
    )


@router.put("/culqi", response_model=CulqiConfigOut)
def guardar_culqi(payload: CulqiConfigIn, db: Session = Depends(get_db), u: User = Depends(get_usuario_actual)):
    if u.role != "propietario":
        raise HTTPException(status_code=403, detail="Solo propietarios")
    _require_pro(db, u.id)

    integ = db.query(PaymentIntegration).filter(PaymentIntegration.user_id == u.id).first()

    if payload.enabled:
        if not payload.culqi_pk and not (integ and integ.culqi_pk):
            raise HTTPException(status_code=400, detail="Falta culqi_pk")
        if not payload.culqi_sk and not (integ and integ.culqi_sk_enc):
            raise HTTPException(status_code=400, detail="Falta culqi_sk")

    if integ is None:
        if not payload.culqi_pk or not payload.culqi_sk:
            raise HTTPException(status_code=400, detail="Debes enviar culqi_pk y culqi_sk")
        try:
            sk_enc = encrypt_secret(payload.culqi_sk.strip())
        except Exception:
            raise HTTPException(status_code=500, detail="DATA_ENCRYPTION_KEY inválida o no configurada")
        integ = PaymentIntegration(
            user_id=u.id,
            enabled=bool(payload.enabled),
            culqi_pk=payload.culqi_pk.strip(),
            culqi_sk_enc=sk_enc,
        )
        db.add(integ)
    else:
        if payload.culqi_pk:
            integ.culqi_pk = payload.culqi_pk.strip()
        if payload.culqi_sk:
            try:
                integ.culqi_sk_enc = encrypt_secret(payload.culqi_sk.strip())
            except Exception:
                raise HTTPException(status_code=500, detail="DATA_ENCRYPTION_KEY inválida o no configurada")
        integ.enabled = bool(payload.enabled)
        db.add(integ)

    db.commit()
    db.refresh(integ)

    return CulqiConfigOut(
        enabled=bool(integ.enabled),
        culqi_pk=integ.culqi_pk,
        sk_set=bool(integ.culqi_sk_enc),
    )


def _get_culqi_sk_or_404(db: Session, user_id: int) -> str:
    integ = db.query(PaymentIntegration).filter(PaymentIntegration.user_id == user_id).first()
    if not integ or not integ.enabled:
        raise HTTPException(status_code=404, detail="Culqi no activo")
    try:
        return decrypt_secret(integ.culqi_sk_enc)
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo descifrar culqi_sk")
