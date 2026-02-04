from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---- Base ----
    CORS_ORIGINS: str = (
        "https://miffuturo.onrender.com,"
        "https://miffuturo-backend.onrender.com,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    # ---- DB ----
    DATABASE_URL: str = "postgresql+psycopg://postgres:12345@localhost:5432/db_marconi"

    # ---- JWT ----
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MIN: int = 60

    # ---- SMTP ----
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    FROM_EMAIL: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True
    ADMIN_NOTIFY_EMAIL: str = ""

    # ---- OAuth (Google) ----
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    UBIGEO_SOURCE_URL: str = "https://raw.githubusercontent.com/pe-datos/ubigeo/master/ubigeo.csv"

    # ---- Culqi ----
    CULQI_PUBLIC_KEY: str = ""
    CULQI_SECRET_KEY: str = ""
    CULQI_PLAN_ID: str = ""

    # ✅ No crashea si aparecen variables extra en .env (por ejemplo NEXT_PUBLIC_*)
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
