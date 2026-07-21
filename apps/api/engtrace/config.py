from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ENGTRACE_", env_file=".env", extra="ignore")

    app_name: str = "EngTrace"
    env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./engtrace.db"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "engtrace"
    s3_secret_key: str = "engtrace-local-only"
    s3_bucket: str = "engtrace-evidence"
    model_base_url: str = "http://localhost:8001/v1"
    model_name: str = "Qwen/Qwen3-8B"
    embedding_model: str = "BAAI/bge-m3"
    embedding_revision: str | None = None
    otel_endpoint: str | None = None
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
