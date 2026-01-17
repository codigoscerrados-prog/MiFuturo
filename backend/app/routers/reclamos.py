from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.deps import get_db, require_role, get_usuario_actual
from app.modelos.modelos import ReclamoCancha, Cancha, User
from app.esquemas.esquemas import ReclamoCrear, ReclamoOut, ReclamoResolver

router = APIRouter(prefix="/reclamos", tags=["reclamos"])

@router.post("", response_model=ReclamoOut, dependencies=[Depends(require_role("propietario","admin"))])
def crear_reclamo(payload: ReclamoCrear, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    cancha = db.query(Cancha).filter(Cancha.id == payload.cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no existe")

    r = ReclamoCancha(
        cancha_id=payload.cancha_id,
        solicitante_id=u.id,
        mensaje=payload.mensaje,
        evidencia_url=payload.evidencia_url,
        estado="pendiente",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.get("", response_model=list[ReclamoOut], dependencies=[Depends(require_role("admin"))])
def listar(db: Session = Depends(get_db)):
    return db.query(ReclamoCancha).order_by(ReclamoCancha.id.desc()).all()

@router.patch("/{reclamo_id}", response_model=ReclamoOut, dependencies=[Depends(require_role("admin"))])
def resolver(reclamo_id: int, payload: ReclamoResolver, db: Session = Depends(get_db), admin=Depends(get_usuario_actual)):
    r = db.query(ReclamoCancha).filter(ReclamoCancha.id == reclamo_id).first()
    if not r:
        raise HTTPException(404, "Reclamo no encontrado")

    r.estado = payload.estado
    r.resuelto_por = admin.id
    r.resuelto_en = datetime.now(timezone.utc)

    if payload.estado == "aprobado":
        if not payload.nuevo_owner_id:
            raise HTTPException(400, "Falta nuevo_owner_id para aprobar")
        owner = db.query(User).filter(User.id == payload.nuevo_owner_id).first()
        if not owner:
            raise HTTPException(404, "Dueño no existe")
        if owner.role not in ("propietario","admin"):
            raise HTTPException(400, "Usuario no es propietario")

        cancha = db.query(Cancha).filter(Cancha.id == r.cancha_id).first()
        cancha.owner_id = payload.nuevo_owner_id

    db.commit()
    db.refresh(r)
    return r
