from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    GEMMA_MODEL: str = "gemma4:e4b"
    EMBED_MODEL: str = "nomic-embed-text"
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    DOCS_DIR: str = "./data/relief_docs"
    CASES_DB: str = "./data/cases.db"
    VISUAL_TOKEN_BUDGET: int = 560

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
