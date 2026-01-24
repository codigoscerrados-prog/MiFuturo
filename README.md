# MifFuturo
ProyectoCanchas: plataforma web para buscar, visualizar en mapa y contactar canchas sintéticas con panel de gestión para propietarios. Frontend en Next.js (app router SSR) y backend en FastAPI + PostgreSQL.

## Repo layout

- `backend/` – FastAPI, modelos SQLAlchemy, la carpeta `uploads/`, y toda la lógica Python. Allí viven `app/main.py`, las rutas, y la carpeta con las migraciones/semillas.
- `frontend/` – aplicación Next.js: `src/`, `public/`, `package.json`, la configuración de `next.config.mjs` y las muestras de `.env` distintas a las del backend.
- `render.yaml` – Blueprint de Render que define los dos servicios (`miffuturo-backend` y `miffuturo`) y sus dependencias.

## Local development

### Backend

- Copia `backend/.env.example` a `backend/.env` y adapta las variables sensibles (DB, JWT, SMTP, OAuth, etc.).
- Instala dependencias con `pip install -r backend/requirements.txt` y arranca la API con `uvicorn app.main:app --reload` desde `backend/`.
- El evento de arranque ejecuta `init_db()` y crea todas las tablas (incluido `ubigeo_*`) más el plan `free`, así que con el `DATABASE_URL` correcto no necesitas correr migraciones manuales.

### Frontend

- `cd frontend`
- `npm install` (esto también mantiene el `package-lock.json` alineado con las dependencias de SWC que Next.js requiere; si ves el warning `Found lockfile missing swc dependencies` vuelve a correr este paso antes de desplegar).
- `npm run dev`
- Usa `frontend/.env` o `.env.local` para ajustar `API_ORIGIN`, `GOOGLE_CLIENT_ID` y otras variables locales; en desarrollo puedes seguir apuntando a `http://127.0.0.1:8000`.
- La UI siempre llama a `/api/...` gracias a `src/lib/api.ts`, el middleware de Next y la reescritura definida en `next.config.mjs` (mira la constante `API_HOSTPORT` para la ejecución en Render).

## Deploying to Render

El repositorio carga `render.yaml` y un Blueprint con dos servicios:

1. **`miffuturo-backend`** (Python) – Raíz `backend/`; instala `requirements.txt`, expone `/healthz`, sirve `/uploads` y crea las tablas/planes al arrancar.
2. **`miffuturo`** (Node) – Raíz `frontend/`; ejecuta `npm ci && npm run build`, arranca con `npm run start` y reescribe `/api/*` hacia el backend usando `API_HOSTPORT`/`API_ORIGIN`.

Render va a publicar:
```
https://miffuturo-backend.onrender.com
https://miffuturo.onrender.com
```

### Services & environment variables

#### Backend (`miffuturo-backend`)
- `DATABASE_URL` – Usa la conexión interna de Render (p. ej. `postgresql://...@.../db_marconi_lateralverde`); no lo subas al repositorio.
- `JWT_SECRET_KEY` – Genera un valor seguro (Render lo puede crear automáticamente).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` – debe ser `https://miffuturo.onrender.com/api/auth/callback/google`.
- `FRONTEND_ORIGIN` – fija en `https://miffuturo.onrender.com`.
- `CORS_ORIGINS` – `https://miffuturo.onrender.com,http://localhost:3000` para permitir la UI y el entorno local.
- `SMTP_*` (HOST, PORT, USER, PASS) según tu proveedor si necesitas enviar correos.
- La opción adicional `DATABASE_URL`, `JWT_SECRET_KEY` y `GOOGLE_*` no deben guardarse en el código.

#### Frontend (`miffuturo`)
- `API_HOSTPORT` – Render la llena automáticamente con el `hostport` del backend (ej. `miffuturo-backend:10000`).
- `API_ORIGIN` – Siempre `https://miffuturo-backend.onrender.com` para que Next.js sepa a dónde redirigir `/api`.
- `GOOGLE_CLIENT_ID` – Reutiliza el mismo ID que se usa en el backend para construir el flujo OAuth en `/api/auth/google/login`; la ruta consume este valor backend-side.
- `NEXT_PUBLIC_API_*` pueden mantenerse para pruebas locales pero no son necesarios en producción.

### Ubigeo & seeds

- La tabla `ubigeo_peru_*` se crea automáticamente si no existe (`init_db()` se encarga). Para cargar la data usa el nuevo endpoint protegido:
  ```
  POST /admin/ubigeo/import
  ```
  Acepta JSON con `departments`, `provinces` y `districts` (o un archivo multipart en formato JSON/CSV con columnas `type,id,name,department_id,province_id`). Activa `replace=true` para borrar todo antes de importar. Se requiere usuario admin.
- Si las rutas públicas `/ubigeo/*` no devuelven datos, el backend registra una advertencia y responde `[]` para que la UI siga funcionando.

### Build notes

- El frontend depende de `/api` sin CORS, por eso el proxy y los helpers de `src/lib/api.ts` son la única forma recomendada de hacer peticiones.
- Si el build de Next sigue fallando con SWC, ejecuta `cd frontend && npm install` para regenerar `package-lock.json`.
