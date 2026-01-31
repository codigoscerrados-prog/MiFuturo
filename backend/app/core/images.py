from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
import os
from functools import lru_cache

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from PIL import Image, ImageOps

_UPLOADS_ROOT = Path("uploads").resolve()


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _s3_bucket() -> str:
    return _env("AWS_S3_BUCKET")


def s3_enabled() -> bool:
    return bool(_s3_bucket() and _env("AWS_ACCESS_KEY_ID") and _env("AWS_SECRET_ACCESS_KEY"))


@lru_cache(maxsize=1)
def _s3_client():
    region = _env("AWS_REGION") or "us-east-1"
    return boto3.client("s3", region_name=region)


def _s3_public_base() -> str | None:
    bucket = _s3_bucket()
    if not bucket:
        return None
    explicit = _env("AWS_S3_PUBLIC_URL")
    if explicit:
        return explicit.rstrip("/")
    region = _env("AWS_REGION") or "us-east-1"
    if region == "us-east-1":
        return f"https://{bucket}.s3.amazonaws.com"
    return f"https://{bucket}.s3.{region}.amazonaws.com"


def build_public_url(key: str) -> str:
    key = key.lstrip("/")
    if s3_enabled():
        base = _s3_public_base() or ""
        return f"{base}/{key}"
    return f"/uploads/{key}"


def save_upload(data: bytes, content_type: str, key: str) -> str:
    key = key.lstrip("/")
    if s3_enabled():
        try:
            _s3_client().put_object(
                Bucket=_s3_bucket(),
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except (BotoCoreError, ClientError):
            raise
        return build_public_url(key)

    path = (_UPLOADS_ROOT / key).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return f"/uploads/{key}"


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


def _s3_key_from_url(url: str) -> str | None:
    if not url:
        return None
    bucket = _s3_bucket()
    if not bucket:
        return None
    parsed = urlparse(url)
    if not parsed.netloc:
        return None
    host = parsed.netloc
    path = parsed.path.lstrip("/")
    if host.startswith(f"{bucket}.") and path:
        return path
    if path.startswith(f"{bucket}/"):
        return path[len(bucket) + 1 :]
    return None


def safe_unlink_upload(url: str) -> bool:
    key = _s3_key_from_url(url)
    if key and s3_enabled():
        try:
            _s3_client().delete_object(Bucket=_s3_bucket(), Key=key)
            return True
        except (BotoCoreError, ClientError):
            return False

    path = _uploads_path_from_url(url)
    if not path or not path.is_file():
        return False
    try:
        path.unlink()
        return True
    except Exception:
        return False
