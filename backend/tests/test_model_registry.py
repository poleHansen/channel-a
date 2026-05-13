from pathlib import Path

from app.config import Settings
from app.main import create_app
from app.models.model_registry import ModelRegistry


def test_model_registry_exposes_two_model_adapters() -> None:
    registry = ModelRegistry()
    assert hasattr(registry, "auto_segmenter")
    assert hasattr(registry, "interactive_segmenter")


def test_create_app_wires_models_dir_into_default_registry(tmp_path: Path) -> None:
    settings = Settings(outputs_dir=tmp_path / "outputs", models_dir=tmp_path / "custom-models")

    app = create_app(settings=settings)

    assert app.state.models.auto_segmenter.model_dir == settings.models_dir
    assert app.state.models.interactive_segmenter.model_dir == settings.models_dir
