from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    # Default demo-safe Gemma model; override with env var if you have a smaller/quantized SKU
    GEMMA_MODEL: str = "gemma4:gemma-4-mini"
    GEMMA_PROVIDER: str = "google"
    GOOGLE_API_KEY: str = ""
    GEMMA_MODEL_CLOUD: str = "gemma-3-27b-it"
    EMBED_MODEL: str = "nomic-embed-text"
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    DOCS_DIR: str = "./data/relief_docs"
    CASES_DB: str = "./data/cases.db"
    VISUAL_TOKEN_BUDGET: int = 560
    # Demo / runtime tuning for Gemma
    GEMMA_QUANTIZED: bool = True
    GEMMA_MAX_TOKENS: int = 512
    GEMMA_MAX_CONTEXT: int = 1024
    GEMMA_MAX_CONCURRENCY: int = 1
    GEMMA_REQUEST_TIMEOUT: int = 15
    GEMMA_STREAMING: bool = True
    # Demo warmup and deterministic behavior
    GEMMA_WARMUP: bool = True
    GEMMA_WARMUP_TIMEOUT: int = 8
    GEMMA_WARMUP_PROMPT: str = "System check: are you ready?"
    GEMMA_DETERMINISTIC: bool = True

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        extra="ignore"
    )


settings = Settings()
