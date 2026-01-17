from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import get_db, get_usuario_actual
from app.core.seguridad import hash_password, verify_password, crear_token
from app.modelos.modelos import User, Plan, Suscripcion
from app.esquemas.esquemas import UsuarioCrear, UsuarioOut, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


class PasswordVerifyIn(BaseModel):
    password: str


@router.post("/register", response_model=UsuarioOut)
def register(payload: UsuarioCrear, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    u = User(
        role=payload.role,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        business_name=payload.business_name,
        phone=payload.phone,
    )

    try:
        db.add(u)
        db.flush()

        free_plan = db.query(Plan).filter(Plan.id == 1).first() or db.query(Plan).filter(Plan.codigo == "free").first()
        if not free_plan:
            raise HTTPException(status_code=500, detail="No existe el plan FREE en la tabla planes")

        if u.role in ("usuario", "propietario"):
            s = Suscripcion(user_id=u.id, plan_id=free_plan.id, estado="activa")
            db.add(s)

        db.commit()
        db.refresh(u)
        return u
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == form.username).first()
    if not u or not verify_password(form.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    token = crear_token(u.id, u.role)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/verify-password")
def verify_password_endpoint(
    payload: PasswordVerifyIn,
    u: User = Depends(get_usuario_actual),
):
    if not verify_password(payload.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Contrasena invalida")
    return {"ok": True}