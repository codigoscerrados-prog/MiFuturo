from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import update  # ✅ IMPORTANTE

from app.core.deps import get_db, require_role, get_usuario_actual
from app.modelos.modelos import Complejo, Cancha, User
from app.esquemas.esquemas import ComplejoCrear, ComplejoActualizar, ComplejoOut

router = APIRouter(prefix="/admin/complejos", tags=["admin-complejos"])


@router.get("", response_model=list[ComplejoOut], dependencies=[Depends(require_role("admin"))])
def listar(db: Session = Depends(get_db)):
    return db.query(Complejo).order_by(Complejo.id.desc()).all()


@router.post("", response_model=ComplejoOut, dependencies=[Depends(require_role("admin"))])
def crear(payload: ComplejoCrear, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    c = Complejo(**payload.model_dump(exclude_none=True), created_by=u.id)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.patch("/{complejo_id}", response_model=ComplejoOut, dependencies=[Depends(require_role("admin"))])
def actualizar(complejo_id: int, payload: ComplejoActualizar, db: Session = Depends(get_db)):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")

    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(c, k, v)

    db.commit()
    db.refresh(c)
    return c


@router.post(
    "/{complejo_id}/asignar-dueno/{owner_id}",
    response_model=ComplejoOut,
    dependencies=[Depends(require_role("admin"))],
)
def asignar_dueno(complejo_id: int, owner_id: int, db: Session = Depends(get_db)):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")

    u = db.query(User).filter(User.id == owner_id).first()
    if not u:
        raise HTTPException(404, "Usuario no existe")
    if u.role not in ("propietario", "admin"):
        raise HTTPException(400, "El usuario no es propietario")

    # 1) asigna dueño al complejo
    c.owner_id = owner_id

    # 2) ✅ sincroniza dueño en TODAS las canchas de ese complejo
    db.execute(
        update(Cancha)
        .where(Cancha.complejo_id == complejo_id)
        .values(owner_id=owner_id)
    )

    db.commit()
    db.refresh(c)
    return c
