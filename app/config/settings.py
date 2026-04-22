# This file is for loading your ENVIRONMENT VARIABLES from the `.env` file.
# Why do this? Because you shouldn't hardcode secrets (like database passwords or API keys) in your code!
# By using Pydantic Settings, we can assure those environment variables exist and are the correct type.

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # These variables MUST match the names in your `.env` file (case insensitive).
    # If a value is provided here (like "Healthcare Platform API"), it acts as a DEFAULT
    # if the `.env` file is missing that specific variable.
    app_name: str = "Healthcare Platform API"
    debug: bool = True
    database_url: str = "postgresql://user:password@localhost:5432/healthcare" # Default PostgreSQL DB URL
    
    # Example: If you needed a secret key, you could define it like this:
    # secret_api_key: str  <-- Notice there is no default value, meaning it is REQUIRED in the .env file.
    
    class Config:
        # This tells Pydantic to read from the `.env` file in the root folder.
        env_file = ".env"

# We instantiate (create) our settings object here so we can import it in other files.
# Usage in another file:
# from app.config.settings import settings
# print(settings.app_name)
settings = Settings()
