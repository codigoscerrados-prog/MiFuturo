from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
import uuid
import io

from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timezone

from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.deps import get_db, require_role, get_usuario_actual
from app.core.images import resize_square_image, save_upload, safe_unlink_upload
from app.core.slug import slugify
from app.modelos.modelos import Complejo, Cancha, CanchaImagen, Reserva, Plan, Suscripcion, User
from app.esquemas.esquemas import (
    ComplejoCrear,
    ComplejoActualizar,
    ComplejoOut,
    CanchaCrear,
    CanchaAdminOut,
    ReservaCrear,
    ReservaOut,
    ReservaPago,
    PagosPageOut,
)

router = APIRouter(prefix="/panel", tags=["panel"])

MAX_BYTES = 2 * 1024 * 1024
ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
}


def check_owner(u, owner_id: int | None):
    return u.role == "admin" or (owner_id is not None and owner_id == u.id)


def _slug_base(nombre: str) -> str:
    base = slugify(nombre or "")
    return base or "complejo"

def _plan_actual(db: Session, user_id: int) -> Plan | None:
    now = datetime.now(timezone.utc)
    fila = (
        db.query(Suscripcion, Plan)
        .join(Plan, Plan.id == Suscripcion.plan_id)
        .filter(
            Suscripcion.user_id == user_id,
            Suscripcion.estado == "activa",
            or_(Suscripcion.fin.is_(None), Suscripcion.fin > now),
        )
        .order_by(Suscripcion.inicio.desc())
        .first()
    )
    if fila:
        return fila[1]
    return None


def _limite_complejos(plan: Plan | None) -> int:
    if plan is None:
        return 0
    if plan and plan.limite_canchas and int(plan.limite_canchas) > 0:
        return int(plan.limite_canchas)
    codigo = (plan.codigo if plan else "") or ""
    nombre = (plan.nombre if plan else "") or ""
    codigo = codigo.lower()
    nombre = nombre.lower()
    if "pro" in codigo or "premium" in codigo or "pro" in nombre or "premium" in nombre:
        return 2
    return 1


def owner_filter_reservas(q, u):
    """
    Propietario: solo reservas de canchas de sus complejos.
    Admin: ve todo.
    """
    if u.role == "admin":
        return q
    return (
        q.join(Cancha, Reserva.cancha_id == Cancha.id)
        .join(Complejo, Cancha.complejo_id == Complejo.id)
        .filter(Complejo.owner_id == u.id)
    )


def _apply_reserva_search(q, search: str | None):
    if not search:
        return q
    term = f"%{search.strip().lower()}%"
    q = q.outerjoin(User, Reserva.cliente)
    return q.filter(
        or_(
            func.lower(User.username).like(term),
            func.lower(User.first_name).like(term),
            func.lower(User.last_name).like(term),
            func.lower(Reserva.payment_status).like(term),
            Reserva.cancha.has(Cancha.nombre.ilike(term)),
        )
    )


def _apply_reserva_fecha(q, fecha: date | None, fecha_inicio: date | None, fecha_fin: date | None):
    start = None
    end = None
    if fecha_inicio:
        start = datetime(fecha_inicio.year, fecha_inicio.month, fecha_inicio.day, 0, 0, 0)
    if fecha_fin:
        end = datetime(fecha_fin.year, fecha_fin.month, fecha_fin.day, 23, 59, 59)
    if fecha and not (fecha_inicio or fecha_fin):
        start = datetime(fecha.year, fecha.month, fecha.day, 0, 0, 0)
        end = datetime(fecha.year, fecha.month, fecha.day, 23, 59, 59)

    if start and end:
        return q.filter(Reserva.start_at <= end, Reserva.end_at >= start)
    if start:
        return q.filter(Reserva.end_at >= start)
    if end:
        return q.filter(Reserva.start_at <= end)
    return q


def reserva_dict(r: Reserva):
    """
    Devuelve un dict compatible con:
    - tu front actual (estado, cancha_nombre, fecha_inicio, fecha_fin)
    - y también con tu modelo real (payment_status, start_at, end_at, etc.)
    """
    return {
        "id": int(r.id),
        "cancha_id": int(r.cancha_id),
        "cliente_id": int(r.cliente_id) if r.cliente_id is not None else None,

        # ✅ lo que tu front usa en historial:
        "estado": r.payment_status,           # alias para front
        "cancha_nombre": r.cancha_nombre,     # property en tu modelo
        "fecha_inicio": r.start_at,           # alias para front
        "fecha_fin": r.end_at,                # alias para front

        # ✅ campos reales del sistema de pagos:
        "start_at": r.start_at,
        "end_at": r.end_at,
        "total_amount": float(r.total_amount or 0),
        "paid_amount": float(r.paid_amount or 0),
        "payment_method": r.payment_method,
        "payment_status": r.payment_status,
        "payment_ref": r.payment_ref,
        "notas": r.notas,
        "created_by": int(r.created_by) if r.created_by is not None else None,
    }


# --------- Complejos (propietario/admin) ---------
@router.get(
    "/complejos",
    response_model=list[ComplejoOut],
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def mis_complejos(db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    q = db.query(Complejo)
    if u.role != "admin":
        q = q.filter(Complejo.owner_id == u.id)
    return q.order_by(Complejo.id.desc()).all()


@router.get(
    "/complejos/{complejo_id}",
    response_model=ComplejoOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def obtener_complejo(complejo_id: int, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")
    if not check_owner(u, c.owner_id):
        raise HTTPException(403, "No autorizado")
    return c


@router.post(
    "/complejos",
    response_model=ComplejoOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def crear_complejo(payload: ComplejoCrear, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    if u.role != "admin":
        plan = _plan_actual(db, u.id)
        limite = _limite_complejos(plan)
        total = db.query(Complejo).filter(Complejo.owner_id == u.id).count()
        if limite == 0:
            raise HTTPException(status_code=403, detail="Debes elegir un plan antes de crear complejos.")
        if total >= limite:
            raise HTTPException(
                status_code=403,
                detail=f"Has alcanzado el limite de complejos de tu plan ({limite}).",
            )
    base = _slug_base(payload.nombre)
    temp_slug = f"{base}-tmp-{uuid.uuid4().hex[:8]}"
    c = Complejo(
        **payload.model_dump(exclude_none=True),
        owner_id=u.id,
        created_by=u.id,
        slug=temp_slug,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    existe = (
        db.query(Complejo)
        .filter(Complejo.slug == base, Complejo.id != c.id)
        .first()
    )
    c.slug = f"{base}-{c.id}" if existe else base
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put(
    "/complejos/{complejo_id}",
    response_model=ComplejoOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def actualizar_complejo(
    complejo_id: int,
    payload: ComplejoActualizar,
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
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
    return c


# ✅ FOTO COMPLEJO (REEMPLAZA SIEMPRE)
@router.post(
    "/complejos/{complejo_id}/foto",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
async def subir_foto_complejo(
    complejo_id: int,
    archivo: UploadFile = File(...),  # tu front manda "archivo"
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    c = db.query(Complejo).filter(Complejo.id == complejo_id).first()
    if not c:
        raise HTTPException(404, "Complejo no encontrado")
    if not check_owner(u, c.owner_id):
        raise HTTPException(403, "No autorizado")

    if archivo.content_type not in ALLOWED:
        raise HTTPException(400, "Formato inválido (JPG/PNG/WEBP/AVIF)")

    data = await archivo.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Archivo muy pesado (max 2MB)")

    ext = ALLOWED[archivo.content_type]
    try:
        data = resize_square_image(data, 400, ext)
    except Exception:
        pass

    filename = f"principal_{uuid.uuid4().hex}{ext}"
    key = f"complejos/{complejo_id}/{filename}"
    if c.foto_url:
        safe_unlink_upload(c.foto_url)
    try:
        c.foto_url = save_upload(data, archivo.content_type, key)
    except Exception:
        raise HTTPException(502, "No se pudo subir la imagen. Verifica permisos de S3.")

    db.add(c)
    db.commit()
    db.refresh(c)

    return {"foto_url": c.foto_url}


# --------- Canchas (propietario/admin) ---------
@router.get(
    "/canchas",
    response_model=list[CanchaAdminOut],
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def mis_canchas(
    complejo_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    q = db.query(Cancha).join(Complejo, Cancha.complejo_id == Complejo.id)

    if u.role != "admin":
        q = q.filter(Complejo.owner_id == u.id)

    if complejo_id is not None:
        q = q.filter(Cancha.complejo_id == complejo_id)

    return q.order_by(Cancha.id.desc()).all()


@router.post(
    "/canchas",
    response_model=CanchaAdminOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def crear_cancha(payload: CanchaCrear, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    complejo_q = db.query(Complejo).filter(Complejo.id == payload.complejo_id)

    if u.role != "admin":
        complejo_q = complejo_q.filter(Complejo.owner_id == u.id)

    complejo = complejo_q.first()
    if not complejo:
        raise HTTPException(403, "Ese complejo no te pertenece o no existe")

    data = payload.model_dump(exclude_none=True)
    data["owner_id"] = complejo.owner_id
    data["created_by"] = u.id

    cancha = Cancha(**data)
    db.add(cancha)
    db.commit()
    db.refresh(cancha)
    return cancha


@router.post(
    "/canchas/{cancha_id}/imagenes/upload",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
async def subir_imagen_cancha(
    cancha_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")

    if not check_owner(u, cancha.owner_id):
        raise HTTPException(403, "No autorizado")

    if archivo.content_type not in ALLOWED:
        raise HTTPException(400, "Formato inválido (JPG/PNG/WEBP/AVIF)")

    data = await archivo.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Archivo muy pesado (max 2MB)")

    ext = ALLOWED[archivo.content_type]
    name = f"{uuid.uuid4().hex}{ext}"

    key = f"canchas/{cancha_id}/{name}"
    try:
        url = save_upload(data, archivo.content_type, key)
    except Exception:
        raise HTTPException(502, "No se pudo subir la imagen. Verifica permisos de S3.")

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

    return {"ok": True, "url": url, "orden": orden}


class CanchaActualizar(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    pasto: Optional[str] = None
    precio_hora: Optional[float] = None
    is_active: Optional[bool] = None


@router.put(
    "/canchas/{cancha_id}",
    response_model=CanchaAdminOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def actualizar_cancha(
    cancha_id: int,
    payload: CanchaActualizar,
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    cancha = db.query(Cancha).filter(Cancha.id == cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")
    if not check_owner(u, cancha.owner_id):
        raise HTTPException(403, "No autorizado")

    data = payload.model_dump(exclude_unset=True)

    if "nombre" in data and data["nombre"] is not None:
        data["nombre"] = data["nombre"].strip()
        if not data["nombre"]:
            raise HTTPException(400, "Nombre inválido")

    if "precio_hora" in data and data["precio_hora"] is not None:
        if data["precio_hora"] <= 0:
            raise HTTPException(400, "Precio inválido")

    for k, v in data.items():
        setattr(cancha, k, v)

    db.add(cancha)
    db.commit()
    db.refresh(cancha)
    return cancha


# ==========================
# RESERVAS
# - usuario: ve SUS reservas (historial)
# - propietario/admin: ve reservas de sus complejos (o todo si admin)
# ==========================
@router.get(
    "/reservas",
    response_model=list[ReservaOut],
    dependencies=[Depends(require_role("usuario", "propietario", "admin"))],
)
def listar_reservas(
    cancha_id: int | None = Query(default=None),
    fecha: date | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    q = db.query(Reserva)

    # ✅ usuario: solo reservas donde es cliente
    if u.role == "usuario":
        q = q.filter(Reserva.cliente_id == u.id)
    else:
        q = owner_filter_reservas(q, u)

    if cancha_id is not None:
        q = q.filter(Reserva.cancha_id == cancha_id)

    q = _apply_reserva_fecha(q, fecha, fecha_inicio, fecha_fin)
    q = _apply_reserva_search(q, search)

    rows = q.order_by(Reserva.start_at.asc()).all()
    return [reserva_dict(r) for r in rows]


@router.get(
    "/pagos",
    response_model=PagosPageOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def listar_pagos_culqi(
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
    fecha: date | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    q = db.query(Reserva).filter(Reserva.payment_method == "culqi")
    q = owner_filter_reservas(q, u)
    q = _apply_reserva_fecha(q, fecha, fecha_inicio, fecha_fin)
    q = _apply_reserva_search(q, search)
    total = q.count()
    rows = (
        q.order_by(Reserva.start_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [reserva_dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/reservas",
    response_model=ReservaOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def crear_reserva(payload: ReservaCrear, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    cancha = db.query(Cancha).filter(Cancha.id == payload.cancha_id).first()
    if not cancha:
        raise HTTPException(404, "Cancha no encontrada")

    if not check_owner(u, cancha.owner_id):
        raise HTTPException(403, "No autorizado")

    # validar solape
    solape = (
        db.query(Reserva)
        .filter(
            Reserva.cancha_id == payload.cancha_id,
            Reserva.payment_status != "cancelada",
            Reserva.start_at < payload.end_at,
            Reserva.end_at > payload.start_at,
        )
        .first()
    )
    if solape:
        raise HTTPException(409, "Ya existe una reserva en ese horario para esta cancha.")

    total = float(payload.total_amount or 0)
    paid = float(payload.paid_amount or 0)
    if paid > total:
        raise HTTPException(400, "El pagado no puede ser mayor que el total.")

    if total <= 0:
        status = "pendiente"
    elif paid <= 0:
        status = "pendiente"
    elif paid < total:
        status = "parcial"
    else:
        status = "pagada"

    r = Reserva(
        cancha_id=payload.cancha_id,
        cliente_id=payload.cliente_id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        total_amount=total,
        paid_amount=paid,
        payment_method=payload.payment_method,
        payment_status=status,
        notas=payload.notas,
        created_by=u.id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return reserva_dict(r)


@router.put(
    "/reservas/{reserva_id}/pago",
    response_model=ReservaOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def registrar_pago(reserva_id: int, payload: ReservaPago, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    r = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")

    cancha = db.query(Cancha).filter(Cancha.id == r.cancha_id).first()
    if not cancha or not check_owner(u, cancha.owner_id):
        raise HTTPException(403, "No autorizado")

    if r.payment_status == "cancelada":
        raise HTTPException(400, "La reserva está cancelada")

    total = float(r.total_amount or 0)
    paid = float(r.paid_amount or 0)

    if payload.mark_paid_full:
        paid = total
    else:
        paid = min(total, paid + float(payload.add_paid or 0))

    r.paid_amount = paid
    if payload.payment_method:
        r.payment_method = payload.payment_method

    if total <= 0:
        r.payment_status = "pendiente"
    elif paid <= 0:
        r.payment_status = "pendiente"
    elif paid < total:
        r.payment_status = "parcial"
    else:
        r.payment_status = "pagada"

    db.add(r)
    db.commit()
    db.refresh(r)
    return reserva_dict(r)


@router.put(
    "/reservas/{reserva_id}/cancelar",
    response_model=ReservaOut,
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def cancelar_reserva(reserva_id: int, db: Session = Depends(get_db), u=Depends(get_usuario_actual)):
    r = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not r:
        raise HTTPException(404, "Reserva no encontrada")

    cancha = db.query(Cancha).filter(Cancha.id == r.cancha_id).first()
    if not cancha or not check_owner(u, cancha.owner_id):
        raise HTTPException(403, "No autorizado")

    r.payment_status = "cancelada"
    db.add(r)
    db.commit()
    db.refresh(r)
    return reserva_dict(r)


# -------- EXPORT EXCEL --------
@router.get(
    "/reservas/export.xlsx",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def export_reservas_excel(
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
    fecha: date | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    search: str | None = Query(default=None),
):
    q = db.query(Reserva)
    q = owner_filter_reservas(q, u)

    q = _apply_reserva_fecha(q, fecha, fecha_inicio, fecha_fin)
    q = _apply_reserva_search(q, search)

    rows = q.order_by(Reserva.start_at.asc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Reservas"

    headers = ["Cancha", "Fecha inicio", "Fecha fin", "Monto", "Pagado", "Modo de pago", "Estado"]
    ws.append(headers)

    for r in rows:
        ws.append([
            r.cancha_nombre or f"#{r.cancha_id}",
            r.start_at.strftime("%Y-%m-%d %H:%M"),
            r.end_at.strftime("%Y-%m-%d %H:%M"),
            float(r.total_amount or 0),
            float(r.paid_amount or 0),
            r.payment_method or "",
            r.payment_status or "",
        ])

    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            v = "" if cell.value is None else str(cell.value)
            max_len = max(max_len, len(v))
        ws.column_dimensions[col_letter].width = min(42, max(12, max_len + 2))

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    filename = "reservas.xlsx" if fecha is None else f"reservas_{fecha.isoformat()}.xlsx"
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# -------- EXPORT PDF --------
@router.get(
    "/reservas/export.pdf",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def export_reservas_pdf(
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
    fecha: date | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    search: str | None = Query(default=None),
):
    q = db.query(Reserva)
    q = owner_filter_reservas(q, u)

    q = _apply_reserva_fecha(q, fecha, fecha_inicio, fecha_fin)
    q = _apply_reserva_search(q, search)

    rows = q.order_by(Reserva.start_at.asc()).all()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    title = "Reporte de Reservas" if fecha is None else f"Reporte de Reservas - {fecha.isoformat()}"
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, height - 40, title)

    c.setFont("Helvetica", 9)
    y = height - 70

    headers = ["Cancha", "Inicio", "Fin", "Monto", "Pagado", "Pago", "Estado"]
    c.drawString(40, y, " | ".join(headers))
    y -= 14
    c.line(40, y, width - 40, y)
    y -= 14

    for r in rows:
        line = " | ".join([
            (r.cancha_nombre or f"#{r.cancha_id}")[:18],
            r.start_at.strftime("%m-%d %H:%M"),
            r.end_at.strftime("%m-%d %H:%M"),
            f"S/{float(r.total_amount or 0):.0f}",
            f"S/{float(r.paid_amount or 0):.0f}",
            (r.payment_method or "")[:10],
            (r.payment_status or "")[:10],
        ])
        c.drawString(40, y, line)
        y -= 12
        if y < 60:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 50

    c.save()
    buffer.seek(0)

    filename = "reservas.pdf" if fecha is None else f"reservas_{fecha.isoformat()}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# -------- EXPORT PAGOS (Culqi) --------
@router.get(
    "/pagos/export.xlsx",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def export_pagos_excel(
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
    fecha: date | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    search: str | None = Query(default=None),
):
    q = db.query(Reserva).filter(Reserva.payment_method == "culqi")
    q = owner_filter_reservas(q, u)
    q = _apply_reserva_fecha(q, fecha, fecha_inicio, fecha_fin)
    q = _apply_reserva_search(q, search)
    rows = q.order_by(Reserva.start_at.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Pagos Culqi"

    headers = ["Cancha", "Fecha inicio", "Fecha fin", "Monto", "Pago", "Referencia", "Estado"]
    ws.append(headers)

    for r in rows:
        ws.append([
            r.cancha_nombre or f"#{r.cancha_id}",
            r.start_at.strftime("%Y-%m-%d %H:%M"),
            r.end_at.strftime("%Y-%m-%d %H:%M"),
            float(r.total_amount or 0),
            r.payment_method or "",
            r.payment_ref or "",
            r.payment_status or "",
        ])

    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            v = "" if cell.value is None else str(cell.value)
            max_len = max(max_len, len(v))
        ws.column_dimensions[col_letter].width = min(42, max(12, max_len + 2))

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    filename = "pagos_culqi.xlsx" if fecha is None else f"pagos_culqi_{fecha.isoformat()}.xlsx"
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/pagos/export.pdf",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def export_pagos_pdf(
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
    fecha: date | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    search: str | None = Query(default=None),
):
    q = db.query(Reserva).filter(Reserva.payment_method == "culqi")
    q = owner_filter_reservas(q, u)
    q = _apply_reserva_fecha(q, fecha, fecha_inicio, fecha_fin)
    q = _apply_reserva_search(q, search)
    rows = q.order_by(Reserva.start_at.desc()).all()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    title = "Reporte de Pagos Culqi" if fecha is None else f"Reporte de Pagos Culqi - {fecha.isoformat()}"
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, height - 40, title)

    c.setFont("Helvetica", 9)
    y = height - 70

    headers = ["Cancha", "Inicio", "Fin", "Monto", "Pago", "Ref", "Estado"]
    c.drawString(40, y, " | ".join(headers))
    y -= 14
    c.line(40, y, width - 40, y)
    y -= 14

    for r in rows:
        line = " | ".join([
            (r.cancha_nombre or f"#{r.cancha_id}")[:18],
            r.start_at.strftime("%m-%d %H:%M"),
            r.end_at.strftime("%m-%d %H:%M"),
            f"S/{float(r.total_amount or 0):.0f}",
            (r.payment_method or "")[:8],
            (r.payment_ref or "")[:10],
            (r.payment_status or "")[:10],
        ])
        c.drawString(40, y, line)
        y -= 12
        if y < 60:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 50

    c.save()
    buffer.seek(0)

    filename = "pagos_culqi.pdf" if fecha is None else f"pagos_culqi_{fecha.isoformat()}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# -------- 16 de enero --------
def _month_range(year: int, month: int):
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end

@router.get(
    "/reservas/mes",
    dependencies=[Depends(require_role("propietario", "admin"))],
)
def reservas_mes(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    """
    Devuelve TODAS las reservas del mes para las canchas del propietario.
    """
    start, end = _month_range(year, month)

    # ⚠️ Ajusta este filtro a tu modelo real:
    # - si tu cancha tiene owner_id: Cancha.owner_id == u.id
    # - si tu cancha tiene propietario_id: Cancha.propietario_id == u.id
    # - si usas created_by: Cancha.created_by == u.id
    owner_filter = getattr(Cancha, "owner_id", None) or getattr(Cancha, "propietario_id", None) or getattr(Cancha, "created_by", None)
    if owner_filter is None:
        # si no existe ninguna, comenta esto y pon tu filtro correcto
        raise Exception("No encontré owner_id/propietario_id/created_by en Cancha. Ajusta el filtro en /reservas/mes.")

    q = (
        db.query(Reserva, Cancha.nombre.label("cancha_nombre"))
        .join(Cancha, Reserva.cancha_id == Cancha.id)
        .filter(owner_filter == u.id)
        .filter(Reserva.start_at >= start)
        .filter(Reserva.start_at < end)
        .order_by(Reserva.start_at.asc())
    )

    out = []
    for r, cancha_nombre in q.all():
        out.append(
            {
                "id": r.id,
                "cancha_id": r.cancha_id,
                "cancha_nombre": cancha_nombre,
                "start_at": r.start_at,
                "end_at": r.end_at,
                "total_amount": r.total_amount,
                "paid_amount": r.paid_amount,
                "payment_method": r.payment_method,
                "payment_status": r.payment_status,
                "notas": r.notas,
            }
        )

    return out

@router.get(
    "/reservas/rango",
    response_model=list[ReservaOut],
    dependencies=[Depends(require_role("usuario", "propietario", "admin"))],
)
def listar_reservas_rango(
    desde: date = Query(..., alias="from"),
    hasta: date = Query(..., alias="to"),
    cancha_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    u=Depends(get_usuario_actual),
):
    if hasta < desde:
        raise HTTPException(400, "Rango inválido: 'to' no puede ser menor que 'from'.")

    q = db.query(Reserva)

    if u.role == "usuario":
        q = q.filter(Reserva.cliente_id == u.id)
    else:
        q = owner_filter_reservas(q, u)

    if cancha_id is not None:
        q = q.filter(Reserva.cancha_id == cancha_id)

    start = datetime(desde.year, desde.month, desde.day, 0, 0, 0)
    end = datetime(hasta.year, hasta.month, hasta.day, 23, 59, 59)

    # mismo criterio que tu listar_reservas (solape por rango)
    q = q.filter(Reserva.start_at <= end, Reserva.end_at >= start)

    rows = q.order_by(Reserva.start_at.asc()).all()
    return [reserva_dict(r) for r in rows]




