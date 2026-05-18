from pathlib import Path
from threading import Lock
from typing import Any

from PIL import Image


class RMBGAdapter:
    _MODEL_DIR_NAME = "rmbg-2.0"
    _REQUIRED_MODEL_FILES = (
        "config.json",
        "preprocessor_config.json",
        "BiRefNet_config.py",
        "birefnet.py",
    )
    _WEIGHT_FILES = ("model.safetensors", "pytorch_model.bin")

    def __init__(self, model_dir: Path = Path("models")) -> None:
        self.model_dir = model_dir
        self._device: Any | None = None
        self._model: Any | None = None
        self._transform: Any | None = None
        self._load_lock = Lock()

    def _resolve_model_dir(self) -> Path:
        if self.model_dir.name == self._MODEL_DIR_NAME:
            return self.model_dir
        return self.model_dir / self._MODEL_DIR_NAME

    def _validate_model_files(self) -> Path:
        resolved_dir = self._resolve_model_dir()
        missing = [
            resolved_dir / name
            for name in self._REQUIRED_MODEL_FILES
            if not (resolved_dir / name).exists()
        ]
        if not any((resolved_dir / name).exists() for name in self._WEIGHT_FILES):
            missing.append(resolved_dir / self._WEIGHT_FILES[0])
        if missing:
            missing_list = ", ".join(path.name for path in missing)
            raise FileNotFoundError(
                f"RMBG-2.0 files not found in {resolved_dir}: {missing_list}"
            )
        return resolved_dir

    def _is_cuda_oom(self, exc: BaseException) -> bool:
        return "out of memory" in str(exc).lower()

    def _load_model(self, model_path: Path, device: Any) -> Any:
        from transformers import AutoModelForImageSegmentation

        return AutoModelForImageSegmentation.from_pretrained(
            str(model_path),
            trust_remote_code=True,
            local_files_only=True,
        ).to(device)

    def _ensure_loaded(self) -> None:
        if self._model is not None and self._transform is not None:
            return

        with self._load_lock:
            if self._model is not None and self._transform is not None:
                return

            model_path = self._validate_model_files()

            import torch
            from torchvision import transforms

            preferred_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

            try:
                self._model = self._load_model(model_path, preferred_device)
                self._device = preferred_device
            except RuntimeError as exc:
                if getattr(preferred_device, "type", None) != "cuda" or not self._is_cuda_oom(exc):
                    raise
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                cpu_device = torch.device("cpu")
                self._model = self._load_model(model_path, cpu_device)
                self._device = cpu_device

            self._model.eval()
            self._transform = transforms.Compose(
                [
                    transforms.Resize((1024, 1024)),
                    transforms.ToTensor(),
                    transforms.Normalize(
                        [0.485, 0.456, 0.406],
                        [0.229, 0.224, 0.225],
                    ),
                ]
            )

    def _extract_prediction(self, output: Any) -> Any:
        if isinstance(output, (list, tuple)):
            return output[-1]
        if hasattr(output, "logits"):
            return output.logits
        return output

    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        self._ensure_loaded()

        import torch

        if self._model is None or self._transform is None or self._device is None:
            raise RuntimeError("RMBG-2.0 model failed to initialize")

        with Image.open(source_rgb_path) as image:
            source = image.convert("RGB")
            original_size = source.size
            input_tensor = self._transform(source).unsqueeze(0).to(self._device)

        with torch.inference_mode():
            prediction = self._extract_prediction(self._model(input_tensor))
            mask_tensor = prediction.sigmoid().detach().cpu()[0].squeeze()

        mask_image = Image.fromarray((mask_tensor.numpy() * 255).clip(0, 255).astype("uint8"))
        mask_image = mask_image.resize(original_size, Image.Resampling.LANCZOS).convert("L")
        output_mask_path.parent.mkdir(parents=True, exist_ok=True)
        mask_image.save(output_mask_path, format="PNG")
