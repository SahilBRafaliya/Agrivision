from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional

# Always resolve relative to this file's directory (Backend/app/config/)
_APP_DIR = Path(__file__).resolve().parent.parent        # → Backend/app/
_MODELS_DIR = _APP_DIR / "models"

class Settings(BaseSettings):
    app_name: str = "AgriVision AI Backend"
    app_version: str = "1.0.0"
    debug: bool = True

    # API URLs
    stac_endpoint: str = "https://planetarycomputer.microsoft.com/api/stac/v1"
    frontend_url: str = "http://localhost:3000"

    # Database — stored next to main.py
    database_url: str = f"sqlite:///{_APP_DIR / 'agrivision.db'}"

    # Model paths — always absolute so they work regardless of cwd
    ssl_encoder_path: str = str(_MODELS_DIR / "ssl_encoder.pth")
    crop_model_path: str  = str(_MODELS_DIR / "crop_model.pkl")
    yield_model_path: str = str(_MODELS_DIR / "yield_model.pkl")

    # Security
    secret_key: str = "agrivision-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    # Admin registration key — change this in production
    admin_secret_key: str = "agrivision-admin-2024"

    class Config:
        env_file = ".env"

settings = Settings()
