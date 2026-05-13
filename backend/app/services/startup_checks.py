from pathlib import Path
from tempfile import NamedTemporaryFile

RMBG_MODEL_DIR_NAME = "rmbg-2.0"
SAM_MODEL_DIR_NAME = "sam2.1"

RMBG_REQUIRED_FILES = (
    "config.json",
    "preprocessor_config.json",
    "BiRefNet_config.py",
    "birefnet.py",
)
RMBG_WEIGHT_FILES = ("model.safetensors", "pytorch_model.bin")
SAM_MODEL_VARIANTS = (
    ("sam2.1_hiera_large.pt", "sam2.1_hiera_l.yaml"),
    ("sam2.1_hiera_base_plus.pt", "sam2.1_hiera_b+.yaml"),
    ("sam2.1_hiera_small.pt", "sam2.1_hiera_s.yaml"),
    ("sam2.1_hiera_tiny.pt", "sam2.1_hiera_t.yaml"),
)


def _is_directory_writable(directory: Path) -> bool:
    try:
        with NamedTemporaryFile(dir=directory):
            return True
    except OSError:
        return False


def _gpu_available() -> bool:
    try:
        import torch
    except Exception:
        return False
    try:
        return bool(torch.cuda.is_available())
    except Exception:
        return False


def get_required_model_dirs(models_dir: Path) -> list[Path]:
    return [
        models_dir / RMBG_MODEL_DIR_NAME,
        models_dir / SAM_MODEL_DIR_NAME,
    ]


def get_expected_model_layout(models_dir: Path) -> dict[str, dict[str, object]]:
    sam_dir = models_dir / SAM_MODEL_DIR_NAME
    return {
        "rmbg": {
            "directory": models_dir / RMBG_MODEL_DIR_NAME,
            "required_files": [*RMBG_REQUIRED_FILES, "model.safetensors or pytorch_model.bin"],
        },
        "sam2.1": {
            "directory": sam_dir,
            "required_files": [
                f"{checkpoint} + {config}"
                for checkpoint, config in SAM_MODEL_VARIANTS
            ],
        },
    }


def _has_rmbg_checkpoint(model_dir: Path) -> bool:
    if not model_dir.exists():
        return False
    if any(not (model_dir / name).exists() for name in RMBG_REQUIRED_FILES):
        return False
    return any((model_dir / name).exists() for name in RMBG_WEIGHT_FILES)


def _has_sam_checkpoint_pair(model_dir: Path) -> bool:
    if not model_dir.exists():
        return False
    for checkpoint_name, config_name in SAM_MODEL_VARIANTS:
        checkpoint_path = model_dir / checkpoint_name
        direct_config_path = model_dir / config_name
        nested_config_path = model_dir / "configs" / SAM_MODEL_DIR_NAME / config_name
        if checkpoint_path.exists() and (direct_config_path.exists() or nested_config_path.exists()):
            return True
    return False


def _missing_model_entries(models_dir: Path) -> list[str]:
    rmbg_dir = models_dir / RMBG_MODEL_DIR_NAME
    sam_dir = models_dir / SAM_MODEL_DIR_NAME
    missing: list[str] = []
    if not _has_rmbg_checkpoint(rmbg_dir):
        missing.append(rmbg_dir.relative_to(models_dir.parent).as_posix())
    if not _has_sam_checkpoint_pair(sam_dir):
        missing.append(sam_dir.relative_to(models_dir.parent).as_posix())
    return missing


def _prepare_outputs_dir(outputs_dir: Path) -> bool:
    try:
        outputs_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        return False
    return _is_directory_writable(outputs_dir)


def run_startup_checks(models_dir: Path, outputs_dir: Path) -> dict[str, object]:
    missing = _missing_model_entries(models_dir)
    outputs_writable = _prepare_outputs_dir(outputs_dir)
    return {
        "gpu_available": _gpu_available(),
        "models_ready": len(missing) == 0,
        "outputs_writable": outputs_writable,
        "missing_model_dirs": missing,
    }
