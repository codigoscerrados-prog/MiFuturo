from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.canchas_publicas import router as canchas_publicas_router
from app.routers.admin_canchas import router as admin_canchas_router
from app.routers.reclamos import router as reclamos_router
from app.routers.admin_complejos import router as admin_complejos_router
from app.routers import admin_cancha_imagenes
from app.routers.perfil import router as perfil_router
from app.routers.panel_propietario import router as panel_router

app = FastAPI(title="Backend ProyectoCanchas", version="1.0.0")

# ✅ asegura carpeta uploads
Path("uploads").mkdir(parents=True, exist_ok=True)

# ✅ sirve archivos: /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ ALIAS para compatibilidad: /static/... (si DB guardó /static/perfiles/...)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # ✅ cachea el preflight (OPTIONS) 24h
)


# ✅ Routers
app.include_router(auth_router)
app.include_router(canchas_publicas_router)
app.include_router(admin_canchas_router)
app.include_router(reclamos_router)
app.include_router(admin_complejos_router)
app.include_router(admin_cancha_imagenes.router)
app.include_router(perfil_router)
app.include_router(panel_router)

@app.get("/health")
def health():
    return {"ok": True}
