# MifFuturo
ProyectoCanchas: plataforma web para buscar, visualizar en mapa y contactar canchas sinteticas, con panel de gestion para propietarios. Frontend en Next.js y backend en FastAPI + PostgreSQL.

## Repo layout

- `backend/` - FastAPI + SQL models, el servicio Python, y la carpeta de uploads. Ahi van las dependencias y el `.env` del backend.
- `frontend/` - aplicacion Next.js (codigo, `src/`, `public/`, `package.json`, configuraciones y variables de entorno propias).
- `render.yaml` - describe ambos servicios en modo monorepo para Render.

## Local development

### Backend

- Copia `backend/.env.example` a `backend/.env` y ajusta las variables necesarias.
- Instala dependencias (`pip install -r backend/requirements.txt`) y arranca la API (por ejemplo `uvicorn app.main:app --reload` desde `backend/`).

### Frontend

- `cd frontend`
- `npm install`
- `npm run dev`
- Usa `frontend/.env` o `.env.local` para apuntar a `NEXT_PUBLIC_API_ORIGIN`, `API_ORIGIN`, y otros secretos segun el entorno.

## Deploying to Render

El repositorio carga `render.yaml`, que describe dos servicios en modo monorepo:

1. **`proyectocanchas-api`** - servicio Python basado en FastAPI ubicado en `backend/`; instala `requirements.txt`, expone `/health`, monta `uploads/` y respeta variables como `CORS_ORIGINS`, `FRONTEND_ORIGIN` y las credenciales necesarias.
2. **`proyectocanchas-web`** - servicio Node anidado en `frontend/` que ejecuta `npm run build` y `npm run start`; reescribe `/api/*` hacia el backend usando `API_ORIGIN`/`NEXT_PUBLIC_API_ORIGIN`.

Render importara ambas automaticamente y deberia exponer `https://proyectocanchas-api.onrender.com` y `https://proyectocanchas-web.onrender.com`.

### Environment variables

- Usa `backend/.env.example` y `frontend/.env.example` como punto de partida a la hora de definir secretos localmente o en Render; cada uno lista las variables que necesita cada servicio.
- El backend requiere `DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y los `SMTP_*` (mantenlas en secretos, no en el repo).
- `CORS_ORIGINS` y `FRONTEND_ORIGIN` deben incluir la URL del frontend desplegado para que FastAPI solo acepte esas peticiones.
- El frontend espera `API_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, `NEXT_PUBLIC_API_URL` (por defecto apunta al backend en `render.yaml`) y `NEXT_PUBLIC_API_PREFIX` si se sobreescribe el proxy `/api`.

### Postgres & uploads

- Provisiona una base de datos PostgreSQL en Render e inyecta su string en `DATABASE_URL`; ejecuta las migraciones localmente o via shell de Render antes de usar la app.
- Los archivos subidos se guardan en `backend/uploads`, una carpeta efimera en Render, asi que mira opciones externas (S3, etc.) si necesitas persistencia a largo plazo.
