from __future__ import annotations

from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from datetime import datetime

Role = Literal["usuario", "propietario", "admin"]
PaymentStatus = Literal["pendiente", "parcial", "pagada", "cancelada"]

# =========================
# Auth / Usuarios
# =========================
class UsuarioCrear(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: Role = "usuario"
    business_name: Optional[str] = None
    phone: Optional[str] = None


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Role
    first_name: str
    last_name: str
    email: EmailStr
    is_active: bool

    # (útiles para panel/perfil)
    business_name: Optional[str] = None
    phone: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# =========================
# Auth OTP
# =========================
class OtpRequestIn(BaseModel):
    email: EmailStr


class OtpVerifyIn(BaseModel):
    email: EmailStr
    code: str


class OtpVerifyOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    needs_profile: bool


# =========================
# Canchas / Imágenes
# =========================
class CanchaCrear(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    tipo: str
    pasto: str
    precio_hora: float
    is_active: bool = True
    owner_id: Optional[int] = None
    complejo_id: Optional[int] = None


class CanchaActualizar(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    tipo: Optional[str] = None
    pasto: Optional[str] = None
    precio_hora: Optional[float] = None
    is_active: Optional[bool] = None
    owner_id: Optional[int] = None
    complejo_id: Optional[int] = None


class CanchaImagenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cancha_id: int
    url: str
    orden: int


class CanchaOut(BaseModel):
    """
    Cancha pública (catálogo)
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None
    tipo: str
    pasto: str
    precio_hora: float
    rating: float = 0
    is_active: bool = True

    techada: bool = False
    iluminacion: bool = False
    vestuarios: bool = False
    estacionamiento: bool = False
    cafeteria: bool = False

    propietario_phone: Optional[str] = None

    # para agrupar / mostrar info del complejo
    complejo_id: Optional[int] = None
    complejo_nombre: Optional[str] = None
    complejo_foto_url: Optional[str] = None  # ✅ solo UNA vez

    # coordenadas del complejo
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    imagen_principal: Optional[str] = None
    imagenes: list[CanchaImagenOut] = Field(default_factory=list)

    culqi_enabled: Optional[bool] = None
    culqi_pk: Optional[str] = None



class CanchaAdminOut(BaseModel):
    """
    Panel admin/propietario (tabla)
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    tipo: str
    pasto: str
    precio_hora: float
    rating: float = 0

    is_active: bool
    owner_id: Optional[int] = None
    complejo_id: Optional[int] = None


# =========================
# Reclamos
# =========================
class ReclamoCrear(BaseModel):
    cancha_id: int
    mensaje: Optional[str] = None
    evidencia_url: Optional[str] = None


class ReclamoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cancha_id: int
    solicitante_id: int
    estado: str
    mensaje: Optional[str] = None
    evidencia_url: Optional[str] = None


class ReclamoResolver(BaseModel):
    estado: Literal["aprobado", "rechazado"]
    nuevo_owner_id: Optional[int] = None


# =========================
# Complejos
# =========================
class ComplejoCrear(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    techada: bool = False
    iluminacion: bool = True
    vestuarios: bool = False
    estacionamiento: bool = False
    cafeteria: bool = False

    is_active: bool = True
    owner_id: Optional[int] = None


class ComplejoActualizar(BaseModel):
    nombre: Optional[str] = None
    slug: Optional[str] = None
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    techada: Optional[bool] = None
    iluminacion: Optional[bool] = None
    vestuarios: Optional[bool] = None
    estacionamiento: Optional[bool] = None
    cafeteria: Optional[bool] = None

    is_active: Optional[bool] = None
    owner_id: Optional[int] = None


class ComplejoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    techada: bool
    iluminacion: bool
    vestuarios: bool
    estacionamiento: bool
    cafeteria: bool

    foto_url: Optional[str] = None

    is_active: bool
    owner_id: Optional[int] = None

class ComplejoPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    techada: bool
    iluminacion: bool
    vestuarios: bool
    estacionamiento: bool
    cafeteria: bool

    foto_url: Optional[str] = None
    is_active: bool
    owner_phone: Optional[str] = None
    culqi_enabled: Optional[bool] = None
    culqi_pk: Optional[str] = None

    canchas: list[CanchaOut] = Field(default_factory=list)


class ComplejoImagenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    orden: int
    is_cover: bool = False


class ComplejoPerfilOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    provincia: Optional[str] = None
    departamento: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    techada: bool
    iluminacion: bool
    vestuarios: bool
    estacionamiento: bool
    cafeteria: bool

    foto_url: Optional[str] = None
    is_active: bool
    owner_id: Optional[int] = None
    owner_phone: Optional[str] = None
    culqi_enabled: Optional[bool] = None
    culqi_pk: Optional[str] = None

    imagenes: list[ComplejoImagenOut] = Field(default_factory=list)
    canchas: list[CanchaOut] = Field(default_factory=list)
    caracteristicas: list[str] = Field(default_factory=list)

    likes_count: int = 0
    liked_by_me: bool = False
    is_owner: bool = False

class ReservaCrear(BaseModel):
    model_config = ConfigDict(extra="ignore")

    cancha_id: int
    start_at: datetime
    end_at: datetime

    total_amount: float = Field(default=0, ge=0)
    paid_amount: float = Field(default=0, ge=0)

    payment_method: Optional[str] = None
    payment_status: PaymentStatus = "pendiente"
    notas: Optional[str] = None
    cliente_id: Optional[int] = None


class ReservaPago(BaseModel):
    add_paid: float = Field(default=0, ge=0)
    payment_method: Optional[str] = None
    mark_paid_full: bool = False


class ReservaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cancha_id: int
    cancha_nombre: Optional[str] = None

    complejo_id: Optional[int] = None
    complejo_nombre: Optional[str] = None

    start_at: datetime
    end_at: datetime

    total_amount: float
    paid_amount: float
    payment_method: Optional[str] = None
    payment_status: PaymentStatus
    payment_ref: Optional[str] = None

    notas: Optional[str] = None
    cliente_id: Optional[int] = None
    created_by: Optional[int] = None

    estado: Optional[PaymentStatus] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None


class PagosPageOut(BaseModel):
    items: list[ReservaOut] = Field(default_factory=list)
    total: int
    page: int
    page_size: int

class PlanActualOut(BaseModel):
    plan_id: int
    plan_codigo: str
    plan_nombre: str
    estado: str
    inicio: Optional[datetime] = None

# =========================
# Ubigeo (OUT)
# =========================

class UbigeoDepartmentOut(BaseModel):
    id: str
    name: str
    class Config:
        from_attributes = True

class UbigeoProvinceOut(BaseModel):
    id: str
    name: str
    department_id: str
    class Config:
        from_attributes = True

class UbigeoDistrictOut(BaseModel):
    id: str
    name: str | None = None
    province_id: str | None = None
    department_id: str | None = None
    class Config:
        from_attributes = True
