"""Centralised, typed application configuration.

All environment configuration is declared here once, validated by pydantic, and
consumed elsewhere via ``settings``. Cloud (online) settings are optional so the
service can boot in an offline-only deployment where no GCP/Mongo config exists.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Read the repo-root .env (when run locally from backend/) or a local .env.
        # In containers, configuration is injected as environment variables.
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        protected_namespaces=(),  # allow fields like `model_id`
    )

    # --- Cloud / online (optional: absent in offline-only deployments) ---
    project_id: str | None = None
    location: str = "us-central1"
    credentials_path: str | None = None
    # Inline service-account key JSON (for hosts without a mounted key file or
    # Google ADC, e.g. Azure Container Apps). Takes precedence over a path.
    google_credentials_json: str | None = None
    mongo_uri: str | None = None
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    model_id: str = "gemini-2.5-flash"

    # --- Offline / local (Ollama + ChromaDB) ---
    ollama_host: str = "http://localhost:11434"
    ollama_llm_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"
    chroma_path: str = "./data/chroma"
    chunk_size: int = 1000
    chunk_overlap: int = 150
    retrieval_top_k: int = 5

    # --- Server ---
    # Comma-separated list of allowed CORS origins, or "*" for all.
    cors_origins: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cloud_enabled(self) -> bool:
        # A project id is enough: credentials may come from a key file
        # (credentials_path) or from Application Default Credentials on the
        # instance (GCP workload identity, mounted ADC, etc.).
        return bool(self.project_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
