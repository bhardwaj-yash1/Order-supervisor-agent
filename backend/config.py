from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GROQ_API_KEY: str
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_AGENT_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_CLASSIFIER_MODEL: str = "llama-3.1-8b-instant"
    TEMPORAL_ADDRESS: str = "localhost:7233"
    TEMPORAL_TASK_QUEUE: str = "order-supervisor"
    DATABASE_URL: str = "sqlite+aiosqlite:///./order_supervisor.db"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
