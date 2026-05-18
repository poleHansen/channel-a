from contextlib import nullcontext
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np
from PIL import Image

from app.schemas.segment import PromptPoint


class SAMAdapter:
    _MODEL_DIR_NAME = "sam2.1"
    _MODEL_VARIANTS = (
        ("sam2.1_hiera_large.pt", "sam2.1_hiera_l.yaml"),
        ("sam2.1_hiera_base_plus.pt", "sam2.1_hiera_b+.yaml"),
        ("sam2.1_hiera_small.pt", "sam2.1_hiera_s.yaml"),
        ("sam2.1_hiera_tiny.pt", "sam2.1_hiera_t.yaml"),
    )

    def __init__(self, model_dir: Path = Path("models")) -> None:
        self.model_dir = model_dir
        self._device: Any | None = None
        self._model: Any | None = None
        self._load_lock = Lock()

    def _resolve_model_dir(self) -> Path:
        if self.model_dir.name == self._MODEL_DIR_NAME:
            return self.model_dir
        return self.model_dir / self._MODEL_DIR_NAME

    def _resolve_model_assets(self) -> tuple[Path, Path] | None:
        model_path = self._resolve_model_dir()
        for checkpoint_name, config_name in self._MODEL_VARIANTS:
            checkpoint_path = model_path / checkpoint_name
            direct_config_path = model_path / config_name
            nested_config_path = model_path / "configs" / "sam2.1" / config_name
            if checkpoint_path.exists() and direct_config_path.exists():
                return checkpoint_path, direct_config_path
            if checkpoint_path.exists() and nested_config_path.exists():
                return checkpoint_path, nested_config_path
        return None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            assets = self._resolve_model_assets()
            if assets is None:
                raise FileNotFoundError(
                    "SAM 2.1 checkpoint/config pair not found under "
                    f"{self._resolve_model_dir()}"
                )
            checkpoint_path, config_path = assets

            import torch
            from sam2.build_sam import build_sam2

            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self._model = build_sam2(
                str(config_path),
                str(checkpoint_path),
                device=self._device,
            )

    def _prepare_point_prompts(
        self, points: list[PromptPoint]
    ) -> tuple[np.ndarray | None, np.ndarray | None]:
        if not points:
            return None, None
        point_coords = np.asarray([[point.x, point.y] for point in points], dtype=np.float32)
        point_labels = np.asarray(
            [1 if point.type == "positive" else 0 for point in points],
            dtype=np.int32,
        )
        return point_coords, point_labels

    def _prepare_box_prompt(self, boxes: list[dict[str, float]]) -> np.ndarray | None:
        if not boxes:
            return None

        left_values: list[float] = []
        top_values: list[float] = []
        right_values: list[float] = []
        bottom_values: list[float] = []

        for box in boxes:
            left = box.get("x0", box.get("left", box.get("x", 0.0)))
            top = box.get("y0", box.get("top", box.get("y", 0.0)))
            right = box.get("x1", box.get("right", left + box.get("width", 0.0)))
            bottom = box.get("y1", box.get("bottom", top + box.get("height", 0.0)))
            left_values.append(float(left))
            top_values.append(float(top))
            right_values.append(float(right))
            bottom_values.append(float(bottom))

        return np.asarray(
            [
                min(left_values),
                min(top_values),
                max(right_values),
                max(bottom_values),
            ],
            dtype=np.float32,
        )

    def refine(
        self,
        source_rgb_path: Path,
        working_mask_path: Path,
        points: list[PromptPoint],
        boxes: list[dict[str, float]],
    ) -> Path:
        if not working_mask_path.exists():
            raise FileNotFoundError(working_mask_path)

        self._ensure_loaded()

        import torch
        from sam2.sam2_image_predictor import SAM2ImagePredictor

        if self._model is None:
            raise RuntimeError("SAM 2.1 model failed to initialize")

        point_coords, point_labels = self._prepare_point_prompts(points)
        box_prompt = self._prepare_box_prompt(boxes)

        with Image.open(source_rgb_path) as image:
            source_array = np.asarray(image.convert("RGB"))

        autocast_context = (
            torch.autocast("cuda", dtype=torch.bfloat16)
            if self._device is not None and getattr(self._device, "type", None) == "cuda"
            else nullcontext()
        )
        with torch.inference_mode(), autocast_context:
            predictor = SAM2ImagePredictor(self._model)
            predictor.set_image(source_array)
            masks, scores, _ = predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                box=box_prompt,
                multimask_output=False,
            )

        mask_array = np.asarray(masks)
        if mask_array.ndim == 3:
            if scores is not None and len(scores) == mask_array.shape[0]:
                mask_array = mask_array[int(np.asarray(scores).argmax())]
            else:
                mask_array = mask_array[0]

        output_mask = Image.fromarray(mask_array.astype(np.uint8) * 255, mode="L")
        output_mask.save(working_mask_path, format="PNG")
        return working_mask_path
