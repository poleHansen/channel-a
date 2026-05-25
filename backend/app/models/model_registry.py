from pathlib import Path

from app.models.base import AutoSegmenter
from app.models.rmbg_adapter import RMBGAdapter
from app.models.sam_adapter import SAMAdapter


class ModelRegistry:
    def __init__(
        self,
        model_dir: Path = Path("models"),
        force_cpu: bool = False,
        auto_segmenter: AutoSegmenter | None = None,
    ) -> None:
        self.auto_segmenter = auto_segmenter or RMBGAdapter(
            model_dir=model_dir,
            force_cpu=force_cpu,
        )
        self.interactive_segmenter = SAMAdapter(
            model_dir=model_dir,
            force_cpu=force_cpu,
        )
