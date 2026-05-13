from typing import Any

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.config import Settings, get_settings
from app.models.model_registry import ModelRegistry
from app.services.startup_checks import run_startup_checks


def create_app(
    settings: Settings | None = None,
    models: Any | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(title="Cutout Web Tool API")
    app.state.settings = resolved_settings
    app.state.models = models or ModelRegistry(model_dir=resolved_settings.models_dir)
    app.state.startup_checks = run_startup_checks(
        models_dir=resolved_settings.models_dir,
        outputs_dir=resolved_settings.outputs_dir,
    )
    app.mount(
        "/outputs",
        StaticFiles(directory=resolved_settings.outputs_dir),
        name="outputs",
    )
    app.include_router(api_router)
    return app


app = create_app()
