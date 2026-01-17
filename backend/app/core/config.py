from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---- Base ----
    CORS_ORIGINS: str = "http://localhost:3000"

    # ---- DB ----
    DATABASE_URL: str = "postgresql+psycopg://postgres:12345@localhost:5432/db_marconi"

    # ---- JWT ----
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MIN: int = 60

    # ✅ No crashea si aparecen variables extra en .env (por ejemplo NEXT_PUBLIC_*)
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
