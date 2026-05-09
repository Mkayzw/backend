# This file is for loading your ENVIRONMENT VARIABLES from the `.env` file.
# Why do this? Because you shouldn't hardcode secrets (like database passwords or API keys) in your code!
# By using Pydantic Settings, we can assure those environment variables exist and are the correct type.

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Any, Optional

class Settings(BaseSettings):
    # These variables MUST match the names in your `.env` file (case insensitive).
    # If a value is provided here (like "Healthcare Platform API"), it acts as a DEFAULT
    # if the `.env` file is missing that specific variable.
    app_name: str = "Healthcare Platform API"
    debug: bool = True
    database_url: str = "postgresql://user:password@localhost:5432/healthcare" # Default PostgreSQL DB URL
    app_version: str = "1.0.0"

    # Web Push (VAPID) settings
    vapid_public_key: Optional[str] = None
    vapid_private_key: Optional[str] = None
    vapid_subject: str = "mailto:admin@example.com"

    # Optional MedGemma settings (disabled until the Colab endpoint is ready)
    medgemma_enabled: bool = False
    medgemma_api_url: Optional[str] = None
    medgemma_timeout_seconds: int = 20
    
    # Example: If you needed a secret key, you could define it like this:
    # secret_api_key: str  <-- Notice there is no default value, meaning it is REQUIRED in the .env file.
    
    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> Any:
        if isinstance(value, str) and value.lower() == "release":
            return False
        return value

    class Config:
        # This tells Pydantic to read from the `.env` file in the root folder.
        env_file = ".env"
        extra = "ignore"

# We instantiate (create) our settings object here so we can import it in other files.
# Usage in another file:
# from app.config.settings import settings
# print(settings.app_name)
settings = Settings()
