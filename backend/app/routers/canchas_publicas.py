from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db
from app.modelos.modelos import Cancha, Complejo, PaymentIntegration
from app.esquemas.esquemas import CanchaOut, ComplejoPublicOut

router = APIRouter(prefix="", tags=["public-canchas"])


@router.get("/complejos", response_model=list[ComplejoPublicOut])
def listar_complejos_publicos(db: Session = Depends(get_db)):
    complejos = (
        db.query(Complejo)
        .options(
            joinedload(Complejo.canchas).joinedload(Cancha.imagenes),
            joinedload(Complejo.owner),
        )
        .filter(Complejo.is_active == True)
        .order_by(Complejo.id.desc())
        .all()
    )

    owner_ids = {c.owner_id for c in complejos if c.owner_id}
    integrations = (
        db.query(PaymentIntegration)
        .filter(PaymentIntegration.user_id.in_(owner_ids), PaymentIntegration.enabled == True)
        .all()
        if owner_ids
        else []
    )
    culqi_pk_by_owner = {i.user_id: i.culqi_pk for i in integrations if i.culqi_pk}

    out = []
    for c in complejos:
        culqi_pk = culqi_pk_by_owner.get(c.owner_id)
        out.append(
            {
                "id": c.id,
                "nombre": c.nombre,
                "slug": c.slug,
                "descripcion": c.descripcion,
                "direccion": c.direccion,
                "distrito": c.distrito,
                "provincia": c.provincia,
                "departamento": c.departamento,
                "latitud": c.latitud,
                "longitud": c.longitud,
                "techada": c.techada,
                "iluminacion": c.iluminacion,
                "vestuarios": c.vestuarios,
                "estacionamiento": c.estacionamiento,
                "cafeteria": c.cafeteria,
                "foto_url": c.foto_url,
                "is_active": c.is_active,
                "owner_phone": c.owner_phone,
                "culqi_enabled": bool(culqi_pk),
                "culqi_pk": culqi_pk,
                "canchas": c.canchas,
            }
        )
    return out


@router.get("/canchas", response_model=list[CanchaOut])
def listar_canchas_publicas(db: Session = Depends(get_db)):
    canchas = (
        db.query(Cancha)
        .options(
            joinedload(Cancha.complejo).joinedload(Complejo.owner),  # trae users.phone
            joinedload(Cancha.imagenes),
        )
        .order_by(Cancha.id.desc())
        .all()
    )

    owner_ids = {
        (c.owner_id or (c.complejo.owner_id if c.complejo else None))
        for c in canchas
        if c.owner_id or (c.complejo and c.complejo.owner_id)
    }
    integrations = (
        db.query(PaymentIntegration)
        .filter(PaymentIntegration.user_id.in_(owner_ids), PaymentIntegration.enabled == True)
        .all()
        if owner_ids
        else []
    )
    culqi_pk_by_owner = {i.user_id: i.culqi_pk for i in integrations if i.culqi_pk}

    out = []
    for c in canchas:
        owner_id = c.owner_id or (c.complejo.owner_id if c.complejo else None)
        culqi_pk = culqi_pk_by_owner.get(owner_id)
        out.append(
            {
                "id": c.id,
                "nombre": c.nombre,
                "distrito": c.distrito,
                "provincia": c.provincia,
                "departamento": c.departamento,
                "tipo": c.tipo,
                "pasto": c.pasto,
                "precio_hora": c.precio_hora,
                "rating": c.rating,
                "techada": c.techada,
                "iluminacion": c.iluminacion,
                "vestuarios": c.vestuarios,
                "estacionamiento": c.estacionamiento,
                "cafeteria": c.cafeteria,
                "imagen_principal": c.imagen_principal,
                "is_active": c.is_active,
                "propietario_phone": c.propietario_phone,
                "latitud": c.latitud,
                "longitud": c.longitud,
                "complejo_id": c.complejo_id,
                "complejo_nombre": c.complejo_nombre,
                "complejo_foto_url": c.complejo_foto_url,
                "imagenes": c.imagenes,
                "culqi_enabled": bool(culqi_pk),
                "culqi_pk": culqi_pk,
            }
        )
    return out
