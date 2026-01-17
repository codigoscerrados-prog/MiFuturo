from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_role, get_usuario_actual
from app.modelos.modelos import Cancha, User
from app.esquemas.esquemas import CanchaCrear, CanchaActualizar, CanchaAdminOut

router = APIRouter(prefix="/admin/canchas", tags=["admin-canchas"])

@router.get("", response_model=list[CanchaAdminOut], dependencies=[Depends(require_role("admin"))])
def listar_todas(db: Session = Depends(get_db)):
    return db.query(Cancha).order_by(Cancha.id.desc()).all()

@router.post("", response_model=CanchaAdminOut, dependencies=[Depends(require_role("admin"))])
def crear_cancha(payload: CanchaCrear, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    cancha = Cancha(**payload.model_dump(exclude_none=True), created_by=u.id)
    db.add(cancha)
    db.commit()
    db.refresh(cancha)
    return cancha

@router.patch("/{cancha_id}", response_model=CanchaAdminOut, dependencies=[Depends(require_role("admin"))])
def actualizar_cancha(cancha_id: int, payload: CanchaActualizar, db: Session = Depends(get_db)):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")

    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(cancha, k, v)

    db.commit()
    db.refresh(cancha)
    return cancha

@router.post("/{cancha_id}/activar", response_model=CanchaAdminOut, dependencies=[Depends(require_role("admin"))])
def activar(cancha_id: int, db: Session = Depends(get_db)):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")
    cancha.is_active = True
    db.commit()
    db.refresh(cancha)
    return cancha

@router.post("/{cancha_id}/desactivar", response_model=CanchaAdminOut, dependencies=[Depends(require_role("admin"))])
def desactivar(cancha_id: int, db: Session = Depends(get_db)):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")
    cancha.is_active = False
    db.commit()
    db.refresh(cancha)
    return cancha

@router.post("/{cancha_id}/asignar-dueno/{owner_id}", response_model=CanchaAdminOut, dependencies=[Depends(require_role("admin"))])
def asignar_dueno(cancha_id: int, owner_id: int, db: Session = Depends(get_db)):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")

    owner = db.query(User).filter(User.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Usuario dueño no existe")

    if owner.role not in ("propietario", "admin"):
        raise HTTPException(400, "El usuario no tiene rol propietario")

    cancha.owner_id = owner_id
    db.commit()
    db.refresh(cancha)
    return cancha
