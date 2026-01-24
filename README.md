# MifFuturo
ProyectoCanchas: plataforma web para buscar, visualizar en mapa y contactar canchas sintéticas, con panel de gestión para propietarios. Frontend en Next.js y backend en FastAPI + PostgreSQL.

## Deploying to Render

The repository ships with `render.yaml`, which describes two services for Render's monorepo mode:

1. **`proyectocanchas-api`** – a Python web service rooted in `backend/`; it installs the FastAPI dependencies, serves `/health`, mounts the `uploads/` folder, and respects `CORS_ORIGINS`, `FRONTEND_ORIGIN` and other secrets provided at build time.
2. **`proyectocanchas-web`** – a Node service that runs `npm run build` and `npm run start`; it rewrites `/api/*` calls to the backend via `API_ORIGIN`/`NEXT_PUBLIC_API_ORIGIN`.

Render will import the two services automatically when you link the repo and should expose `https://proyectocanchas-api.onrender.com` for the backend and `https://proyectocanchas-web.onrender.com` for the frontend.

### Environment variables

- Use `.env.example` as a baseline when running locally or when defining Render secrets. It lists every variable the backend and frontend currently read (database credentials, JWT secrets, SMTP/Gmail, and client IDs).  
- The backend expects `DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and `SMTP_*` values. Keep them in Render secrets, not committed files.
- `CORS_ORIGINS` and `FRONTEND_ORIGIN` should include the frontend service URL so FastAPI only accepts requests from the deployed UI.
- The frontend relies on `API_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, `NEXT_PUBLIC_API_URL` (defaulted to the backend service in `render.yaml`) plus `NEXT_PUBLIC_API_PREFIX` when overriding the `/api` proxy.

### Postgres & uploads

- Provision a Render PostgreSQL database and inject its connection string into `DATABASE_URL`. Run your migrations locally or via Render shell before using the app.
- Uploaded files are stored under `backend/uploads`; this path is ephemeral on Render, so consider copying them to external storage (S3, etc.) when persistence is required.
