from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services import startup_checks


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    models_dir = tmp_path / "models"
    rmbg_dir = models_dir / "rmbg-2.0"
    rmbg_dir.mkdir(parents=True)
    for filename in (
        "config.json",
        "preprocessor_config.json",
        "BiRefNet_config.py",
        "birefnet.py",
        "model.safetensors",
    ):
        (rmbg_dir / filename).write_text("placeholder", encoding="utf-8")

    sam_dir = models_dir / "sam2.1"
    sam_dir.mkdir(parents=True)
    (sam_dir / "sam2.1_hiera_large.pt").write_bytes(b"checkpoint")
    (sam_dir / "sam2.1_hiera_l.yaml").write_text("model: sam2.1", encoding="utf-8")

    settings = Settings(outputs_dir=tmp_path / "outputs", models_dir=models_dir)
    with TestClient(create_app(settings=settings)) as test_client:
        yield test_client


def test_health_endpoint_reports_ok(client: TestClient) -> None:
    expected_gpu_available = startup_checks._gpu_available()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "gpu_available": expected_gpu_available,
        "models_ready": True,
        "outputs_writable": True,
        "missing_model_dirs": [],
    }
