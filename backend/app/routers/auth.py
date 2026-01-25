from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import secrets
import json
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import get_db, get_usuario_actual
from app.core.config import settings
from app.core.seguridad import hash_password, verify_password, crear_token
from app.core.email import send_email_code
from app.modelos.modelos import User, Plan, Suscripcion, LoginOtp
from app.utils.mailer import send_email
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


def _post_form(url: str, data: dict) -> dict:
    body = urlencode(data).encode("utf-8")
    req = Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urlopen(req, timeout=15) as resp:
        payload = resp.read().decode("utf-8")
    return json.loads(payload)


def _get_json(url: str, headers: dict | None = None) -> dict:
    req = Request(url, method="GET")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urlopen(req, timeout=15) as resp:
        payload = resp.read().decode("utf-8")
    return json.loads(payload)


@router.post("/register", response_model=UsuarioOut)
def register(payload: UsuarioCrear, db: Session = Depends(get_db), background_tasks: BackgroundTasks):
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
        registered_at = datetime.now(timezone.utc)
        background_tasks.add_task(
            send_email,
            u.email,
            "¡Bienvenido/a! Tu cuenta fue creada",
            f"Hola {u.first_name or u.email},\n\nGracias por registrarte en Proyecto Canchas. Tu cuenta fue creada correctamente en {registered_at.isoformat()}.\n\nNos alegra tenerte con nosotros.\n\nSaludos,\nEquipo Proyecto Canchas",
        )
        if settings.ADMIN_NOTIFY_EMAIL:
            background_tasks.add_task(
                send_email,
                settings.ADMIN_NOTIFY_EMAIL,
                "Nueva cuenta creada",
                (
                    f"Se registró una nueva cuenta en Proyecto Canchas:\n\n"
                    f"ID: {u.id}\n"
                    f"Nombre: {u.first_name or '—'} {u.last_name or ''}\n"
                    f"Email: {u.email}\n"
                    f"Rol: {u.role}\n"
                    f"Registrado en: {registered_at.isoformat()}"
                ),
            )
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


@router.get("/google/login")
def google_login(
    role: str | None = Query(default=None),
    next: str | None = Query(default=None),
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth no configurado")

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
    }
    state_payload: dict[str, str] = {}
    if role:
        normalized_role = role.strip().lower()
        if normalized_role in {"usuario", "propietario"}:
            state_payload["role"] = normalized_role
    if next:
        state_payload["next"] = next

    if state_payload:
        params["state"] = json.dumps(state_payload)

    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(
    code: str = Query(...),
    state: str | None = Query(default=None),
    mode: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth no configurado")

    token_data = _post_form(
        "https://oauth2.googleapis.com/token",
        {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No se pudo validar Google")

    userinfo = _get_json(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    email = (userinfo.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email no disponible")

    requested_role = "usuario"
    requested_next: str | None = None
    if state:
        try:
            state_payload = json.loads(state)
            if isinstance(state_payload, dict):
                candidate = state_payload.get("role")
                if isinstance(candidate, str):
                    candidate = candidate.strip().lower()
                    if candidate in {"usuario", "propietario"}:
                        requested_role = candidate
                next_candidate = state_payload.get("next")
                if isinstance(next_candidate, str) and next_candidate.strip():
                    requested_next = next_candidate.strip()
        except Exception:
            pass

    u = db.query(User).filter(User.email == email).first()
    created = False
    if not u:
        created = True
        first_name = (userinfo.get("given_name") or "Usuario").strip() or "Usuario"
        last_name = (userinfo.get("family_name") or "Google").strip() or "Google"
        u = User(
            role=requested_role,
            first_name=first_name,
            last_name=last_name,
            email=email,
            hashed_password=hash_password(secrets.token_hex(16)),
            avatar_url=userinfo.get("picture"),
            phone="999999999",
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
    else:
        actualizado = False
        given = (userinfo.get("given_name") or "").strip()
        family = (userinfo.get("family_name") or "").strip()
        if given and not (u.first_name or "").strip():
            u.first_name = given
            actualizado = True
        if family and not (u.last_name or "").strip():
            u.last_name = family
            actualizado = True
        if not (u.phone or "").strip():
            u.phone = "999999999"
            actualizado = True
        if userinfo.get("picture") and not (u.avatar_url or "").strip():
            u.avatar_url = userinfo.get("picture")
            actualizado = True
        if actualizado:
            db.add(u)
            db.commit()
            db.refresh(u)

    token = crear_token(u.id, u.role)
    if mode == "json":
        response = {"access_token": token, "token_type": "bearer", "needs_profile": created}
        if requested_next:
            response["next"] = requested_next
        return response

    frontend = settings.FRONTEND_ORIGIN.rstrip("/")
    redirect_url = f"{frontend}/auth/callback/google?token={token}&needs_profile={'1' if created else '0'}"
    if requested_next:
        redirect_url += f"&next={quote(requested_next, safe='/:?&=')}"
    return RedirectResponse(redirect_url)


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
