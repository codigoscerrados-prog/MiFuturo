from app.db.conexion import SessionLocal, engine
from app.modelos.base import Base
import app.modelos.modelos  # noqa: F401
from app.modelos.modelos import Plan


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

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
