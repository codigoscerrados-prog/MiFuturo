from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.conexion import SessionLocal
from app.core.seguridad import decodificar_token
from app.modelos.modelos import User

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_usuario_actual(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    try:
        data = decodificar_token(token)
        user_id = int(data.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    u = db.query(User).filter(User.id == user_id).first()
    if not u or not u.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no válido")

    return u


# ✅ Alias para compatibilidad (por si en algún lado llamas get_current_user)
get_current_user = get_usuario_actual


def require_role(*roles: str):
    def checker(u: User = Depends(get_usuario_actual)) -> User:
        if u.role not in roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        return u

    return checker
