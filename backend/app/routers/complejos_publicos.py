from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
import uuid

from app.core.deps import get_db, get_usuario_actual, require_role
from app.core.images import resize_square_image, safe_unlink_upload, save_upload
from app.core.seguridad import decodificar_token
from app.core.slug import slugify
from app.modelos.modelos import Complejo, ComplejoImagen, ComplejoLike, Cancha, Reserva, User
from app.esquemas.esquemas import ComplejoPerfilOut, ComplejoActualizar, ComplejoImagenOut

router = APIRouter(prefix="", tags=["public-complejos"])

oauth2_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
}


def _slug_base(nombre: str) -> str:
    base = slugify(nombre or "")
    return base or "complejo"


def check_owner(u: User | None, owner_id: int | None) -> bool:
    return bool(u) and (u.role == "admin" or (owner_id is not None and owner_id == u.id))


def caracteristicas_de(c: Complejo) -> list[str]:
    items: list[str] = []
    if c.techada:
        items.append("Techada")
    if c.iluminacion:
        items.append("Iluminacion")
    if c.vestuarios:
        items.append("Vestuarios")
    if c.estacionamiento:
        items.append("Estacionamiento")
    if c.cafeteria:
        items.append("Cafeteria")
    return items


def _float_or_none(v):
    try:
        return float(v) if v is not None else None
    except Exception:
        return None


def get_usuario_opcional(
    token: str | None = Depends(oauth2_optional),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    try:
        data = decodificar_token(token)
        user_id = int(data.get("sub"))
    except Exception:
        return None
    u = db.query(User).filter(User.id == user_id).first()
    if not u or not u.is_active:
        return None
    return u


@router.get("/public/complejos/{slug}", response_model=ComplejoPerfilOut)
def obtener_complejo_publico(
    slug: str,
    db: Session = Depends(get_db),
    u: User | None = Depends(get_usuario_opcional),
):
    c = (
        db.query(Complejo)
        .options(
            joinedload(Complejo.canchas).joinedload(Cancha.imagenes),
            joinedload(Complejo.imagenes),
            joinedload(Complejo.owner),
        )
        .filter(Complejo.slug == slug)
        .first()
    )
    if not c or not c.is_active:
        raise HTTPException(404, "Complejo no encontrado")

    imagenes = sorted(
        c.imagenes,
        key=lambda img: (not bool(img.is_cover), img.orden, img.id),
    )
    canchas = [cx for cx in (c.canchas or []) if cx.is_active]

    likes_count = db.query(ComplejoLike).filter(ComplejoLike.complejo_id == c.id).count()
    liked_by_me = False
    if u:
        liked_by_me = (
            db.query(ComplejoLike)
            .filter(ComplejoLike.complejo_id == c.id, ComplejoLike.user_id == u.id)
            .first()
            is not None
        )

    return {
        "id": c.id,
        "nombre": c.nombre,
        "slug": c.slug,
        "descripcion": c.descripcion,
        "direccion": c.direccion,
        "distrito": c.distrito,
        "provincia": c.provincia,
        "departamento": c.departamento,
        "latitud": _float_or_none(c.latitud),
        "longitud": _float_or_none(c.longitud),
        "techada": c.techada,
        "iluminacion": c.iluminacion,
        "vestuarios": c.vestuarios,
        "estacionamiento": c.estacionamiento,
        "cafeteria": c.cafeteria,
        "foto_url": c.foto_url,
        "is_active": c.is_active,
        "owner_id": c.owner_id,
        "owner_phone": c.owner_phone,
        "imagenes": imagenes,
        "canchas": canchas,
        "caracteristicas": caracteristicas_de(c),
        "likes_count": likes_count,
        "liked_by_me": liked_by_me,
        "is_owner": check_owner(u, c.owner_id),
    }


@router.post("/complejos/{complejo_id}/like")
def toggle_like(
    complejo_id: int,
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c or not c.is_active:
        raise HTTPException(404, "Complejo no encontrado")

    existing = (
        db.query(ComplejoLike)
        .filter(ComplejoLike.complejo_id == complejo_id, ComplejoLike.user_id == u.id)
        .first()
    )
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(ComplejoLike(complejo_id=complejo_id, user_id=u.id))
        liked = True
    db.commit()

    likes_count = db.query(ComplejoLike).filter(ComplejoLike.complejo_id == complejo_id).count()
    return {"likes_count": likes_count, "liked_by_me": liked}


@router.post(
    "/complejos/{complejo_id}/imagenes",
    response_model=list[ComplejoImagenOut],
    dependencies=[Depends(require_role("propietario", "admin"))],
)
async def subir_imagenes_complejo(
    complejo_id: int,
    archivos: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")
    if not check_owner(u, c.owner_id):
        raise HTTPException(403, "No autorizado")

    existentes = db.query(ComplejoImagen).filter(ComplejoImagen.complejo_id == complejo_id).count()
    if existentes + len(archivos) > 10:
        raise HTTPException(400, "Maximo 10 imagenes por complejo")

    ultimo = (
        db.query(ComplejoImagen)
        .filter(ComplejoImagen.complejo_id == complejo_id)
        .order_by(ComplejoImagen.orden.desc())
        .first()
    )
    orden = (ultimo.orden + 1) if ultimo else 0

    nuevos: list[ComplejoImagen] = []
    for archivo in archivos:
        if archivo.content_type not in ALLOWED:
            raise HTTPException(400, "Formato invalido (JPG/PNG/WEBP/AVIF)")

        data = await archivo.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "Archivo muy pesado (max 5MB)")

        ext = ALLOWED[archivo.content_type]
        try:
            data = resize_square_image(data, 400, ext)
        except Exception:
            pass
        name = f"galeria_{uuid.uuid4().hex}{ext}"
        key = f"complejos/{complejo_id}/{name}"
        url = save_upload(data, archivo.content_type, key)
        img = ComplejoImagen(complejo_id=complejo_id, url=url, orden=orden, is_cover=False)
        orden += 1
        db.add(img)
        nuevos.append(img)

    if existentes == 0 and nuevos:
        nuevos[0].is_cover = True

    db.commit()
    return nuevos


@router.delete(
    "/complejos/{complejo_id}/imagenes/{imagen_id}",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def eliminar_imagen_complejo(
    complejo_id: int,
    imagen_id: int,
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")
    if not check_owner(u, c.owner_id):
        raise HTTPException(403, "No autorizado")

    img = (
        db.query(ComplejoImagen)
        .filter(ComplejoImagen.id == imagen_id, ComplejoImagen.complejo_id == complejo_id)
        .first()
    )
    if not img:
        raise HTTPException(404, "Imagen no encontrada")

    url = img.url
    db.delete(img)
    db.commit()
    if url:
        safe_unlink_upload(url)
    return {"ok": True}


@router.patch(
    "/complejos/{complejo_id}",
    response_model=ComplejoPerfilOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def actualizar_complejo_publico(
    complejo_id: int,
    payload: ComplejoActualizar,
    db: Session = Depends(get_db),
    u: User = Depends(get_usuario_actual),
):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")
    if not check_owner(u, c.owner_id):
        raise HTTPException(403, "No autorizado")

    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        nuevo = slugify(data.get("slug") or "")
        if not nuevo:
            raise HTTPException(400, "Slug invalido")
        existente = (
            db.query(Complejo)
            .filter(Complejo.slug == nuevo, Complejo.id != c.id)
            .first()
        )
        if existente:
            raise HTTPException(409, "El slug ya esta en uso")
        c.slug = nuevo
        data.pop("slug", None)

    for k, v in data.items():
        if k == "owner_id":
            continue
        setattr(c, k, v)

    db.add(c)
    db.commit()
    db.refresh(c)

    imagenes = sorted(
        c.imagenes,
        key=lambda img: (not bool(img.is_cover), img.orden, img.id),
    )
    canchas = [cx for cx in (c.canchas or []) if cx.is_active]
    likes_count = db.query(ComplejoLike).filter(ComplejoLike.complejo_id == c.id).count()

    return {
        "id": c.id,
        "nombre": c.nombre,
        "slug": c.slug,
        "descripcion": c.descripcion,
        "direccion": c.direccion,
        "distrito": c.distrito,
        "provincia": c.provincia,
        "departamento": c.departamento,
        "latitud": _float_or_none(c.latitud),
        "longitud": _float_or_none(c.longitud),
        "techada": c.techada,
        "iluminacion": c.iluminacion,
        "vestuarios": c.vestuarios,
        "estacionamiento": c.estacionamiento,
        "cafeteria": c.cafeteria,
        "foto_url": c.foto_url,
        "is_active": c.is_active,
        "owner_id": c.owner_id,
        "owner_phone": c.owner_phone,
        "imagenes": imagenes,
        "canchas": canchas,
        "caracteristicas": caracteristicas_de(c),
        "likes_count": likes_count,
        "liked_by_me": False,
        "is_owner": check_owner(u, c.owner_id),
    }


@router.get("/public/canchas/{cancha_id}/horarios")
def horarios_cancha_publica(
    cancha_id: int,
    fecha: str | None = Query(None, description="YYYY-MM-DD; default hoy"),
    db: Session = Depends(get_db),
):
    if fecha:
        try:
            target_date = date.fromisoformat(fecha)
        except ValueError:
            raise HTTPException(400, "Fecha inválida")
    else:
        target_date = date.today()

    slots: list[dict[str, str | bool]] = []
    for hour in range(6, 22):
        slot_start = datetime(target_date.year, target_date.month, target_date.day, hour)
        slot_end = slot_start + timedelta(hours=1)
        ocupado = (
            db.query(Reserva)
            .filter(Reserva.cancha_id == cancha_id)
            .filter(Reserva.payment_status != "cancelada")
            .filter(Reserva.start_at < slot_end)
            .filter(Reserva.end_at > slot_start)
            .count()
            > 0
        )
        slots.append({"hora": f"{hour:02d}:00", "ocupado": ocupado})

    return {"cancha_id": cancha_id, "fecha": target_date.isoformat(), "slots": slots}
