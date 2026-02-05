from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _get_fernet() -> Fernet:
    key = (settings.DATA_ENCRYPTION_KEY or "").strip()
    if not key:
        raise ValueError("DATA_ENCRYPTION_KEY no configurada")
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as exc:
        raise ValueError("DATA_ENCRYPTION_KEY invalida") from exc


def encrypt_secret(value: str) -> str:
    if value is None:
        raise ValueError("valor invalido")
    token = _get_fernet().encrypt(value.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(token: str) -> str:
    if not token:
        raise ValueError("token invalido")
    try:
        value = _get_fernet().decrypt(token.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("token invalido") from exc
    return value.decode("utf-8")
