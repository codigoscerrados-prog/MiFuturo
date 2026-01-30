from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageOps

_UPLOADS_ROOT = Path("uploads").resolve()


def resize_square_image(data: bytes, size: int, ext: str) -> bytes:
    with Image.open(BytesIO(data)) as img:
        if ext == ".png":
            img = img.convert("RGBA")
            fmt = "PNG"
            params = {}
        elif ext == ".webp":
            img = img.convert("RGB")
            fmt = "WEBP"
            params = {"quality": 82}
        else:
            img = img.convert("RGB")
            fmt = "JPEG"
            params = {"quality": 82, "optimize": True}

        img = ImageOps.fit(img, (size, size), method=Image.LANCZOS)

        out = BytesIO()
        img.save(out, format=fmt, **params)
        return out.getvalue()


def _uploads_path_from_url(url: str) -> Path | None:
    if not url:
        return None
    path = url
    if "://" in url:
        path = urlparse(url).path or ""
    if not path:
        return None
    if path.startswith("/static/"):
        path = "/uploads/" + path[len("/static/") :]
    if not path.startswith("/uploads/"):
        return None
    rel = path[len("/uploads/") :].lstrip("/")
    candidate = (_UPLOADS_ROOT / rel).resolve()
    try:
        candidate.relative_to(_UPLOADS_ROOT)
    except ValueError:
        return None
    return candidate


def safe_unlink_upload(url: str) -> bool:
    path = _uploads_path_from_url(url)
    if not path or not path.is_file():
        return False
    try:
        path.unlink()
        return True
    except Exception:
        return False
