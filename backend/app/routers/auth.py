from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import get_db, get_usuario_actual
from app.core.seguridad import hash_password, verify_password, crear_token
from app.core.email import send_email_code
from app.modelos.modelos import User, Plan, Suscripcion, LoginOtp
from app.esquemas.esquemas import (
    UsuarioCrear,
    UsuarioOut,
    TokenOut,
    OtpRequestIn,
    OtpVerifyIn,
    OtpVerifyOut,
)

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


@router.post("/otp/request")
def request_otp(payload: OtpRequestIn, db: Session = Depends(get_db)):
    """
    Genera un codigo OTP de 6 digitos y lo envia por email.
    """
    email = payload.email.strip().lower()
    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash = hash_password(code)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=10)

    otp = db.query(LoginOtp).filter(LoginOtp.email == email).first()
    if otp:
        otp.code_hash = code_hash
        otp.expires_at = expires_at
        otp.attempts = 0
        otp.created_at = now
    else:
        otp = LoginOtp(
            email=email,
            code_hash=code_hash,
            expires_at=expires_at,
            attempts=0,
            created_at=now,
        )
        db.add(otp)

    db.commit()

    # Envia siempre el correo si la configuracion esta lista.
    send_email_code(email, code)

    return {"message": "Si el correo existe, enviaremos un codigo."}


@router.post("/otp/verify", response_model=OtpVerifyOut)
def verify_otp(payload: OtpVerifyIn, db: Session = Depends(get_db)):
    """
    Verifica OTP y devuelve token. Si el usuario no existe, lo crea.
    """
    email = payload.email.strip().lower()
    code = payload.code.strip()

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(status_code=400, detail="Codigo invalido")

    otp = db.query(LoginOtp).filter(LoginOtp.email == email).first()
    if not otp:
        raise HTTPException(status_code=400, detail="Codigo invalido")

    if otp.attempts >= 5:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Solicita otro codigo.")

    now = datetime.now(timezone.utc)
    if otp.expires_at < now:
        db.delete(otp)
        db.commit()
        raise HTTPException(status_code=400, detail="Codigo expirado")

    if not verify_password(code, otp.code_hash):
        otp.attempts = otp.attempts + 1
        db.commit()
        raise HTTPException(status_code=400, detail="Codigo invalido")

    db.delete(otp)
    db.commit()

    u = db.query(User).filter(User.email == email).first()
    created = False
    if not u:
        created = True
        u = User(
            role="usuario",
            first_name="Usuario",
            last_name="Nuevo",
            email=email,
            hashed_password=hash_password(secrets.token_hex(16)),
        )

        try:
            db.add(u)
            db.flush()

            free_plan = (
                db.query(Plan).filter(Plan.id == 1).first()
                or db.query(Plan).filter(Plan.codigo == "free").first()
            )
            if not free_plan:
                raise HTTPException(status_code=500, detail="No existe el plan FREE en la tabla planes")

            s = Suscripcion(user_id=u.id, plan_id=free_plan.id, estado="activa")
            db.add(s)

            db.commit()
            db.refresh(u)
        except HTTPException:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    token = crear_token(u.id, u.role)
    return {"access_token": token, "token_type": "bearer", "needs_profile": created}


@router.post("/verify-password")
def verify_password_endpoint(
    payload: PasswordVerifyIn,
    u: User = Depends(get_usuario_actual),
):
    if not verify_password(payload.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Contrasena invalida")
    return {"ok": True}
