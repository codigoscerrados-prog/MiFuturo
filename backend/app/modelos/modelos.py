from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Boolean,
    Text,
    Numeric,
    Integer,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.modelos.base import Base


# =========================
# Users
# =========================
class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    role = Column(String(20), nullable=False, default="usuario")
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)

    business_name = Column(String(120))
    phone = Column(String(40))

    # perfil jugador
    player_position = Column(String(40))
    jersey_number = Column(Integer)

    # avatar perfil
    avatar_url = Column(Text)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # relaciones útiles (opcionales)
    complejos = relationship("Complejo", back_populates="owner", foreign_keys="Complejo.owner_id")
    canchas = relationship("Cancha", back_populates="owner", foreign_keys="Cancha.owner_id")

    suscripciones = relationship("Suscripcion", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    payment_integration = relationship(
        "PaymentIntegration",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# =========================
# Payment Integrations
# =========================
class PaymentIntegration(Base):
    __tablename__ = "payment_integrations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    provider = Column(String(20), nullable=False, default="culqi")
    enabled = Column(Boolean, nullable=False, default=False)

    culqi_pk = Column(Text, nullable=False)
    culqi_sk_enc = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="payment_integration")


# =========================
# Login OTP
# =========================
class LoginOtp(Base):
    __tablename__ = "login_otps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# =========================
# Complejos
# =========================
class Complejo(Base):
    __tablename__ = "complejos"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    nombre = Column(String(160), nullable=False)
    slug = Column(String(220), nullable=False, unique=True, index=True)
    descripcion = Column(Text)
    direccion = Column(String(240))
    distrito = Column(String(120))
    provincia = Column(String(120))
    departamento = Column(String(120))

    latitud = Column(Numeric)   # si quieres más preciso: Numeric(10, 7)
    longitud = Column(Numeric)  # si quieres más preciso: Numeric(10, 7)

    techada = Column(Boolean, nullable=False, default=False)
    iluminacion = Column(Boolean, nullable=False, default=True)
    vestuarios = Column(Boolean, nullable=False, default=False)
    estacionamiento = Column(Boolean, nullable=False, default=False)
    cafeteria = Column(Boolean, nullable=False, default=False)

    # relaciones útiles (opcionales)
    
    
    # ✅ CLAVE: ahora sí está mapeado en ORM (antes faltaba)
    foto_url = Column(Text)
    
    is_active = Column(Boolean, nullable=False, default=True)

    owner_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    owner = relationship("User", back_populates="complejos", foreign_keys=[owner_id])

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    canchas = relationship(
        "Cancha",
        back_populates="complejo",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    imagenes = relationship(
        "ComplejoImagen",
        back_populates="complejo",
        cascade="all, delete-orphan",
        order_by="ComplejoImagen.orden",
        passive_deletes=True,
    )

    likes = relationship(
        "ComplejoLike",
        back_populates="complejo",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def owner_phone(self):
        return self.owner.phone if self.owner else None


# =========================
# Canchas
# =========================
class Cancha(Base):
    __tablename__ = "canchas"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    nombre = Column(String(140), nullable=False)
    descripcion = Column(Text)

    # ✅ NO uses latitud/longitud como atributos si vas a exponer properties con el mismo nombre.
    # Mapeo las columnas de BD "latitud/longitud" con otro nombre de atributo:
    cancha_latitud = Column("latitud", Numeric)
    cancha_longitud = Column("longitud", Numeric)

    tipo = Column(String(20), nullable=False)
    pasto = Column(String(20), nullable=False)
    precio_hora = Column(Numeric(10, 2), nullable=False, default=0)

    rating = Column(Numeric(3, 2), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    owner_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    complejo_id = Column(BigInteger, ForeignKey("complejos.id", ondelete="SET NULL"), nullable=True)

    complejo = relationship("Complejo", back_populates="canchas")
    owner = relationship("User", back_populates="canchas", foreign_keys=[owner_id])

    imagenes = relationship(
        "CanchaImagen",
        back_populates="cancha",
        cascade="all, delete-orphan",
        order_by="CanchaImagen.orden",
        passive_deletes=True,
    )
    
    reservas = relationship(
    "Reserva",
    back_populates="cancha",
    cascade="all, delete-orphan",
    passive_deletes=True,
)


    @property
    def imagen_principal(self):
        return self.imagenes[0].url if self.imagenes else None

    # ========= Campos "derivados" del complejo (para tu CanchaOut público) =========
    @property
    def distrito(self):
        return self.complejo.distrito if self.complejo else None

    @property
    def provincia(self):
        return self.complejo.provincia if self.complejo else None

    @property
    def departamento(self):
        return self.complejo.departamento if self.complejo else None

    @property
    def techada(self):
        return bool(self.complejo.techada) if self.complejo else False

    @property
    def iluminacion(self):
        return bool(self.complejo.iluminacion) if self.complejo else False

    @property
    def vestuarios(self):
        return bool(self.complejo.vestuarios) if self.complejo else False

    @property
    def estacionamiento(self):
        return bool(self.complejo.estacionamiento) if self.complejo else False

    @property
    def cafeteria(self):
        return bool(self.complejo.cafeteria) if self.complejo else False

    @property
    def propietario_phone(self):
        return self.complejo.owner.phone if self.complejo and self.complejo.owner else None

    # ✅ Coordenadas: prioriza el complejo; si no hay, usa las de cancha
    @property
    def latitud(self):
        return self.complejo.latitud if self.complejo and self.complejo.latitud is not None else self.cancha_latitud

    @property
    def longitud(self):
        return self.complejo.longitud if self.complejo and self.complejo.longitud is not None else self.cancha_longitud

    @property
    def complejo_nombre(self):
        return self.complejo.nombre if self.complejo else None

    @property
    def complejo_foto_url(self):
        return self.complejo.foto_url if self.complejo else None


# =========================
# Imágenes de Cancha
# =========================
class CanchaImagen(Base):
    __tablename__ = "cancha_imagenes"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    cancha_id = Column(BigInteger, ForeignKey("canchas.id", ondelete="CASCADE"), nullable=False, index=True)

    url = Column(Text, nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cancha = relationship("Cancha", back_populates="imagenes")


# =========================
# Imágenes de Complejo
# =========================
class ComplejoImagen(Base):
    __tablename__ = "complejo_imagenes"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    complejo_id = Column(BigInteger, ForeignKey("complejos.id", ondelete="CASCADE"), nullable=False, index=True)

    url = Column(Text, nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    is_cover = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complejo = relationship("Complejo", back_populates="imagenes")


# =========================
# Likes de Complejo
# =========================
class ComplejoLike(Base):
    __tablename__ = "complejo_likes"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    complejo_id = Column(BigInteger, ForeignKey("complejos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complejo = relationship("Complejo", back_populates="likes")
    user = relationship("User")


# =========================
# Reclamos
# =========================
class ReclamoCancha(Base):
    __tablename__ = "reclamos_cancha"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    cancha_id = Column(BigInteger, ForeignKey("canchas.id", ondelete="CASCADE"), nullable=False)
    solicitante_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    mensaje = Column(Text)
    evidencia_url = Column(Text)

    estado = Column(String(20), nullable=False, default="pendiente")

    resuelto_por = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resuelto_en = Column(DateTime(timezone=True), nullable=True)

class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    cancha_id = Column(BigInteger, ForeignKey("canchas.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    start_at = Column(DateTime, nullable=False)  # TIMESTAMP (naive)
    end_at = Column(DateTime, nullable=False)

    total_amount = Column(Numeric(10, 2), nullable=False, default=0)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)

    payment_method = Column(String(30))
    payment_status = Column(String(20), nullable=False, default="pendiente")  # pendiente|parcial|pagada|cancelada
    payment_ref = Column(String(120))

    notas = Column(Text)

    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    cancha = relationship("Cancha", back_populates="reservas")
    cliente = relationship("User", foreign_keys=[cliente_id])
    creador = relationship("User", foreign_keys=[created_by])

    @property
    def cancha_nombre(self):
        return self.cancha.nombre if self.cancha else None

    @property
    def complejo_id(self):
        return self.cancha.complejo_id if self.cancha else None

    @property
    def complejo_nombre(self):
        return self.cancha.complejo.nombre if (self.cancha and self.cancha.complejo) else None


# =========================
# Planes / Suscripciones
# =========================
class Plan(Base):
    __tablename__ = "planes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    codigo = Column(String(40), nullable=False, unique=True)
    nombre = Column(String(80), nullable=False)

    precio_mensual = Column(Numeric(10, 2), nullable=False, default=0)
    limite_canchas = Column(Integer, nullable=False, default=1)

    permite_estadisticas = Column(Boolean, nullable=False, default=False)
    permite_marketing = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Suscripcion(Base):
    __tablename__ = "suscripciones"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(BigInteger, ForeignKey("planes.id", ondelete="RESTRICT"), nullable=False, index=True)

    estado = Column(String(20), nullable=False, default="activa")  # activa/cancelada/pendiente
    inicio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fin = Column(DateTime(timezone=True))

    proveedor = Column(String(40))
    proveedor_ref = Column(String(120))
    proveedor_customer = Column(String(120))
    proveedor_email = Column(String(255))

    user = relationship("User", back_populates="suscripciones")
    plan = relationship("Plan")


# =========================
# Ubigeo
# =========================
class UbigeoDepartment(Base):
    __tablename__ = "ubigeo_peru_departments"

    id: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(45), nullable=False)

    provinces: Mapped[list["UbigeoProvince"]] = relationship(back_populates="department")
    districts: Mapped[list["UbigeoDistrict"]] = relationship(back_populates="department")


class UbigeoProvince(Base):
    __tablename__ = "ubigeo_peru_provinces"

    id: Mapped[str] = mapped_column(String(4), primary_key=True)
    name: Mapped[str] = mapped_column(String(45), nullable=False)

    department_id: Mapped[str] = mapped_column(
        String(2),
        ForeignKey("ubigeo_peru_departments.id"),
        nullable=False,
        index=True,
    )

    department: Mapped["UbigeoDepartment"] = relationship(back_populates="provinces")
    districts: Mapped[list["UbigeoDistrict"]] = relationship(back_populates="province")


class UbigeoDistrict(Base):
    __tablename__ = "ubigeo_peru_districts"

    id: Mapped[str] = mapped_column(String(6), primary_key=True)

    # En tu tabla: name DEFAULT NULL
    name: Mapped[str | None] = mapped_column(String(45), nullable=True)

    # En tu tabla: province_id DEFAULT NULL
    province_id: Mapped[str | None] = mapped_column(
        String(4),
        ForeignKey("ubigeo_peru_provinces.id"),
        nullable=True,
        index=True,
    )

    # En tu tabla: department_id DEFAULT NULL
    department_id: Mapped[str | None] = mapped_column(
        String(2),
        ForeignKey("ubigeo_peru_departments.id"),
        nullable=True,
        index=True,
    )

    province: Mapped["UbigeoProvince | None"] = relationship(back_populates="districts")
    department: Mapped["UbigeoDepartment | None"] = relationship(back_populates="districts")
