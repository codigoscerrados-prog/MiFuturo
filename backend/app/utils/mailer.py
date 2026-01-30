import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("app.utils.mailer")


def _get_from_email() -> Optional[str]:
    return settings.SMTP_FROM or settings.FROM_EMAIL or None


def _is_configured() -> bool:
    if not settings.SMTP_HOST or not _get_from_email():
        return False
    if settings.SMTP_USER and not settings.SMTP_PASS:
        return False
    return True


def send_email(to_email: str, subject: str, text: str, html: str | None = None) -> None:
    from_email = _get_from_email()
    if not _is_configured() or not from_email:
        logger.warning("SMTP no configurado (se omitió el envío a %s)", to_email)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    server = None
    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
        logger.info("Correo enviado a %s", to_email)
    except Exception as exc:
        logger.exception("Error al enviar correo a %s: %s", to_email, exc)
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass
