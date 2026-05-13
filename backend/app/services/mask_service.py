from pathlib import Path

from PIL import Image

from app.utils.mask_ops import draw_binary_brush


def apply_binary_brush(
    mask_path: Path,
    *,
    x: int,
    y: int,
    radius: int,
    mode: str,
) -> None:
    with Image.open(mask_path) as mask_image:
        updated_mask = draw_binary_brush(
            mask_image,
            x=x,
            y=y,
            radius=radius,
            mode=mode,
        )
    updated_mask.save(mask_path, format="PNG")
