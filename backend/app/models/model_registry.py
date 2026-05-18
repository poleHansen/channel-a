from pathlib import Path

from app.models.base import AutoSegmenter
from app.models.rmbg_adapter import RMBGAdapter
from app.models.sam_adapter import SAMAdapter


class ModelRegistry:
    def __init__(
        self,
        model_dir: Path = Path("models"),
        auto_segmenter: AutoSegmenter | None = None,
    ) -> None:
        self.auto_segmenter = auto_segmenter or RMBGAdapter(model_dir=model_dir)
        self.interactive_segmenter = SAMAdapter(model_dir=model_dir)
