from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 7860
    outputs_dir: Path = Path("outputs")
    models_dir: Path = Path("models")

    model_config = SettingsConfigDict(env_prefix="CUTOUT_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
