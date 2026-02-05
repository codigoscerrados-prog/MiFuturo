import logging

from app.db.conexion import SessionLocal, engine
from sqlalchemy import text
from app.modelos.base import Base
import app.modelos.modelos  # noqa: F401
from app.modelos.modelos import Plan
from app.scripts.bootstrap_db import bootstrap_ubigeo

logger = logging.getLogger(__name__)


def _ensure_plan(db_session, codigo: str, defaults: dict) -> Plan:
    plan = db_session.query(Plan).filter(Plan.codigo == codigo).first()
    if plan:
        updated = False
        for key, value in defaults.items():
            if getattr(plan, key, None) != value:
                setattr(plan, key, value)
                updated = True
        if updated:
            db_session.add(plan)
            db_session.commit()
            db_session.refresh(plan)
        return plan
    plan = Plan(codigo=codigo, **defaults)
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)
    return plan


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(120)"))
            conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS public.payment_integrations ("
                    "id BIGSERIAL PRIMARY KEY, "
                    "user_id BIGINT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE, "
                    "provider VARCHAR(20) NOT NULL DEFAULT 'culqi', "
                    "enabled BOOLEAN NOT NULL DEFAULT FALSE, "
                    "culqi_pk TEXT NOT NULL, "
                    "culqi_sk_enc TEXT NOT NULL, "
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
                    "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
                    ")"
                )
            )
            conn.execute(text("ALTER TABLE public.payment_integrations ADD COLUMN IF NOT EXISTS culqi_pk TEXT"))
            conn.execute(text("ALTER TABLE public.payment_integrations ADD COLUMN IF NOT EXISTS culqi_sk_enc TEXT"))
    except Exception as exc:
        logger.warning("Add payment_ref failed: %s", exc)
    try:
        bootstrap_ubigeo()
    except Exception as exc:
        logger.warning("Bootstrap ubigeo failed: %s", exc)

    with SessionLocal() as db:
        _ensure_plan(
            db,
            "free",
            {
                "nombre": "Plan Free",
                "precio_mensual": 0,
                "limite_canchas": 1,
                "permite_estadisticas": False,
                "permite_marketing": False,
            },
        )
        _ensure_plan(
            db,
            "pro",
            {
                "nombre": "Plan Pro",
                "precio_mensual": 69.9,
                "limite_canchas": 3,
                "permite_estadisticas": True,
                "permite_marketing": True,
            },
        )
