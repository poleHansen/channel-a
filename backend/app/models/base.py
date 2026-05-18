from pathlib import Path
from typing import Protocol


class AutoSegmenter(Protocol):
    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        ...
