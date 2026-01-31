from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.deps import get_db, require_role
from app.core.images import safe_unlink_upload, save_upload
from app.modelos.modelos import Cancha, CanchaImagen

router = APIRouter(prefix="/admin/canchas", tags=["admin-canchas-imagenes"])

MAX_BYTES = 2 * 1024 * 1024
ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
}

@router.post("/{cancha_id}/imagenes/upload", dependencies=[Depends(require_role("admin"))])
async def subir_imagen(cancha_id: int, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")

    if archivo.content_type not in ALLOWED:
        raise HTTPException(400, "Formato inválido (JPG/PNG/WEBP/AVIF)")

    data = await archivo.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Archivo muy pesado (max 2MB)")

    ext = ALLOWED[archivo.content_type]
    name = f"{uuid.uuid4().hex}{ext}"

    key = f"canchas/{cancha_id}/{name}"
    url = save_upload(data, archivo.content_type, key)

    # orden automático al final
    ultimo = (
        db.query(CanchaImagen)
        .filter(CanchaImagen.cancha_id == cancha_id)
        .order_by(CanchaImagen.orden.desc())
        .first()
    )
    orden = (ultimo.orden + 1) if ultimo else 0

    img = CanchaImagen(cancha_id=cancha_id, url=url, orden=orden)
    db.add(img)
    db.commit()
    db.refresh(img)

    return {"id": img.id, "url": img.url, "orden": img.orden}


@router.get("/{cancha_id}/imagenes", dependencies=[Depends(require_role("admin"))])
def listar_imagenes(cancha_id: int, db: Session = Depends(get_db)):
    return (
        db.query(CanchaImagen)
        .filter(CanchaImagen.cancha_id == cancha_id)
        .order_by(CanchaImagen.orden.asc())
        .all()
    )


@router.delete("/imagenes/{imagen_id}", dependencies=[Depends(require_role("admin"))])
def eliminar_imagen(imagen_id: int, db: Session = Depends(get_db)):
    img = db.query(CanchaImagen).filter(CanchaImagen.id == imagen_id).first()
    if not img:
        raise HTTPException(404, "Imagen no encontrada")
    url = img.url
    db.delete(img)
    db.commit()
    if url:
        safe_unlink_upload(url)
    return {"ok": True}




