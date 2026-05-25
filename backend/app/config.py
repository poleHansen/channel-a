from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8000
    outputs_dir: Path = ROOT_DIR / "outputs"
    models_dir: Path = ROOT_DIR / "models"
    force_cpu: bool = False

    model_config = SettingsConfigDict(env_prefix="CUTOUT_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
