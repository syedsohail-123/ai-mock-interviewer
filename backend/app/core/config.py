import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "AI-Powered Mock Interview Backend"
    API_V1_PREFIX: str = "/api"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Neon PostgreSQL Cloud Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")  # "openai", "groq", "ollama", "nvidia", "mock"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_MODEL: str = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    
    # Audio & TTS
    TTS_ENABLED: bool = os.getenv("TTS_ENABLED", "true").lower() == "true"
    STT_ENGINE: str = os.getenv("STT_ENGINE", "groq_whisper")
    GROQ_WHISPER_MODEL: str = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

settings = Settings()
