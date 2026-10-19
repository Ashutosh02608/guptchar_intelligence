"""
AI Module Configuration
Supports multi-provider configuration (Gemini, OpenAI, Anthropic, Ollama, Heuristic)
via environment variables or local .env file.
"""

import os
from pathlib import Path

# Load .env if present
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass

class AIConfig:
    # Provider selection: "auto", "gemini", "openai", "anthropic", "ollama", "heuristic"
    PROVIDER: str = os.getenv("AI_PROVIDER", "auto").lower()

    # Gemini API Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # OpenAI API Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    # Anthropic Claude Settings
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")

    # Ollama Local LLM Settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")

    # Operational Parameters
    CACHE_DB_PATH: str = os.getenv("AI_CACHE_DB", str(Path(__file__).parent / "analysis_cache.db"))
    TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_SECONDS", "30.0"))
    MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", "2"))

    @staticmethod
    def is_valid_key(key: str) -> bool:
        """Validates that an API key is not empty, blank, or a dummy template placeholder."""
        if not key or not isinstance(key, str):
            return False
        k = key.strip()
        if len(k) < 8:
            return False
        if k.startswith("AQ."):
            return False
        lower = k.lower()
        if any(dummy in lower for dummy in ["your_", "_here", "placeholder", "xxxx", "test_key"]):
            return False
        return True

    @classmethod
    def get_active_provider(cls) -> str:
        if cls.PROVIDER != "auto":
            return cls.PROVIDER
        if cls.is_valid_key(cls.GEMINI_API_KEY):
            return "gemini"
        if cls.is_valid_key(cls.OPENAI_API_KEY):
            return "openai"
        if cls.is_valid_key(cls.ANTHROPIC_API_KEY):
            return "anthropic"
        return "heuristic"

config = AIConfig()
