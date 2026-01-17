from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db
from app.modelos.modelos import Cancha, Complejo
from app.esquemas.esquemas import CanchaOut

router = APIRouter(prefix="", tags=["public-canchas"])

@router.get("/canchas", response_model=list[CanchaOut])
def listar_canchas_publicas(db: Session = Depends(get_db)):
    return (
        db.query(Cancha)
        .options(
            joinedload(Cancha.complejo).joinedload(Complejo.owner),  # ✅ trae users.phone
            joinedload(Cancha.imagenes),
        )
        .filter(Cancha.is_active == True)
        .order_by(Cancha.id.desc())
        .all()
    )
