import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_email_code(email: str, code: str) -> None:
    """
    Envia un codigo OTP simple por SMTP.
    """
    if not settings.SMTP_HOST or not settings.FROM_EMAIL:
        raise RuntimeError("SMTP no configurado")

    msg = EmailMessage()
    msg["Subject"] = "Tu codigo de acceso"
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = email
    msg.set_content(
        "Tu codigo de acceso es:\n"
        f"{code}\n\n"
        "Este codigo expira en 10 minutos.\n"
        "Si no solicitaste este codigo, ignora este correo."
    )

    server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
    try:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
    finally:
        server.quit()
