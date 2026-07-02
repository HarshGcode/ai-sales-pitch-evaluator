from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://feedback:feedback@localhost:5432/feedback"
    JWT_SECRET: str = "change-me-in-prod-please"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    STORAGE_BACKEND: str = "local"
    STORAGE_ROOT: str = "./storage"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Local dev: frontend and backend are both on "localhost" (same site, different
    # port), so Lax + non-Secure works over plain HTTP. Once frontend and backend live
    # on different registrable domains (e.g. vercel.app vs railway.app), the browser
    # treats them as cross-site, and only "None" + Secure cookies are sent on those
    # cross-site requests. Set COOKIE_SAMESITE=none and COOKIE_SECURE=true in that
    # deployment's env vars (both must change together — "None" requires Secure).
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def mock_mode(self) -> bool:
        return not (self.OPENAI_API_KEY or self.GROQ_API_KEY)


settings = Settings()
