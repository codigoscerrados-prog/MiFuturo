import logging

from app.db.conexion import SessionLocal, engine
from app.modelos.base import Base
import app.modelos.modelos  # noqa: F401
from app.modelos.modelos import Plan
from app.scripts.bootstrap_db import bootstrap_ubigeo

logger = logging.getLogger(__name__)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    try:
        bootstrap_ubigeo()
    except Exception as exc:
        logger.warning("Bootstrap ubigeo failed: %s", exc)

    with SessionLocal() as db:
        existing = db.query(Plan).filter(Plan.codigo == "free").first()
        if existing:
            return

        free_plan = Plan(
            codigo="free",
            nombre="Plan Free",
            precio_mensual=0,
            limite_canchas=1,
            permite_estadisticas=False,
            permite_marketing=False,
        )
        db.add(free_plan)
        db.commit()
