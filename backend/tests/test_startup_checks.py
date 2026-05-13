from pathlib import Path

import pytest

from app.services import startup_checks


def test_startup_checks_report_missing_models(tmp_path: Path) -> None:
    expected_gpu_available = startup_checks._gpu_available()
    result = startup_checks.run_startup_checks(
        models_dir=tmp_path / "models",
        outputs_dir=tmp_path / "outputs",
    )
    assert result == {
        "gpu_available": expected_gpu_available,
        "models_ready": False,
        "outputs_writable": True,
        "missing_model_dirs": [
            "models/rmbg-2.0",
            "models/sam2.1",
        ],
    }


def test_startup_checks_report_ready_models_when_required_dirs_exist(
    tmp_path: Path,
) -> None:
    expected_gpu_available = startup_checks._gpu_available()
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

    result = startup_checks.run_startup_checks(
        models_dir=models_dir,
        outputs_dir=tmp_path / "outputs",
    )

    assert result == {
        "gpu_available": expected_gpu_available,
        "models_ready": True,
        "outputs_writable": True,
        "missing_model_dirs": [],
    }


def test_startup_checks_report_outputs_not_writable(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_permission_error(*args: object, **kwargs: object) -> None:
        raise PermissionError("no write access")

    monkeypatch.setattr(
        startup_checks,
        "NamedTemporaryFile",
        raise_permission_error,
        raising=False,
    )

    result = startup_checks.run_startup_checks(
        models_dir=tmp_path / "models",
        outputs_dir=tmp_path / "outputs",
    )

    assert result["outputs_writable"] is False


def test_startup_checks_report_outputs_not_writable_when_directory_creation_fails(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_permission_error(*args: object, **kwargs: object) -> None:
        raise PermissionError("cannot create outputs directory")

    monkeypatch.setattr(Path, "mkdir", raise_permission_error)

    result = startup_checks.run_startup_checks(
        models_dir=tmp_path / "models",
        outputs_dir=tmp_path / "outputs",
    )

    assert result["outputs_writable"] is False
