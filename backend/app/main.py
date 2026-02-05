from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.canchas_publicas import router as canchas_publicas_router
from app.routers.complejos_publicos import router as complejos_publicos_router
from app.routers.admin_canchas import router as admin_canchas_router
from app.routers.reclamos import router as reclamos_router
from app.routers.admin_complejos import router as admin_complejos_router
from app.db.init_db import init_db
from app.routers import admin_cancha_imagenes
from app.routers.admin_ubigeo import router as admin_ubigeo_router
from app.routers.perfil import router as perfil_router
from app.routers.panel_propietario import router as panel_router
from app.routers.ubigeo import router as ubigeo_router
from app.routers.pagos_culqi import router as pagos_culqi_router
from app.routers.utilitarios import router as utilitarios_router

app = FastAPI(title="Backend ProyectoCanchas", version="1.0.0")

# ✅ asegura carpeta uploads
Path("uploads").mkdir(parents=True, exist_ok=True)

# ✅ sirve archivos: /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ ALIAS para compatibilidad: /static/... (si DB guardó /static/perfiles/...)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

def _parse_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]

DEFAULT_CORS_ORIGINS = [
    "https://miffuturo.onrender.com",
    "https://miffuturo-backend.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

allowed_origins = _parse_origins(settings.CORS_ORIGINS) or DEFAULT_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # ✅ cachea el preflight (OPTIONS) 24h
)


# ✅ Routers
app.include_router(auth_router)
app.include_router(canchas_publicas_router)
app.include_router(complejos_publicos_router)
app.include_router(admin_canchas_router)
app.include_router(reclamos_router)
app.include_router(admin_complejos_router)
app.include_router(admin_cancha_imagenes.router)
app.include_router(admin_ubigeo_router)
app.include_router(perfil_router)
app.include_router(panel_router)
app.include_router(ubigeo_router)
app.include_router(pagos_culqi_router)
app.include_router(utilitarios_router)

@app.get("/healthz")
def health():
    return {"ok": True}


@app.on_event("startup")
def on_startup():
    init_db()
