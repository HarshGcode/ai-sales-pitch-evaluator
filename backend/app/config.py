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

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def mock_mode(self) -> bool:
        return not (self.OPENAI_API_KEY or self.GROQ_API_KEY)


settings = Settings()
