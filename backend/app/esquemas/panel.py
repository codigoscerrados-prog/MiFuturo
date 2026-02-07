from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

Role = Literal["usuario", "propietario", "admin"]


class PerfilOut(BaseModel):
    id: int
    role: Role
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    business_name: Optional[str] = None

    # jugador (usuario)
    player_position: Optional[str] = None
    jersey_number: Optional[int] = None

    # ambos roles
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class PerfilUpdate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    business_name: Optional[str] = None
    player_position: Optional[str] = None
    jersey_number: Optional[int] = None


class PlanActualOut(BaseModel):
    plan_id: int
    plan_codigo: str
    plan_nombre: str
    estado: str
    proveedor: Optional[str] = None
    trial_disponible: Optional[bool] = None
    trial_expirado: Optional[bool] = None
    inicio: Optional[datetime] = None
    fin: Optional[datetime] = None
    dias_restantes: Optional[int] = None
    culqi_estado: Optional[str] = None
    culqi_mensaje: Optional[str] = None
