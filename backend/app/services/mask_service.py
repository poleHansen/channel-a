from pathlib import Path

from PIL import Image, ImageChops

from app.schemas.segment import BrushPoint
from app.utils.mask_ops import draw_binary_brush, draw_soft_brush


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


def render_soft_brush(
    mask_path: Path,
    *,
    points: list[BrushPoint],
    size: float,
    softness: float,
    tool: str,
) -> tuple[Image.Image, bool]:
    if tool == "brush-add":
        brush_mode = "add"
    elif tool == "brush-remove":
        brush_mode = "remove"
    else:
        raise ValueError(f"Unsupported brush tool: {tool}")

    with Image.open(mask_path) as mask_image:
        original_mask = mask_image.convert("L")
        updated_mask = draw_soft_brush(
            original_mask,
            points=[(point.x, point.y) for point in points],
            size=size,
            softness=softness,
            mode=brush_mode,
        )
    changed = ImageChops.difference(updated_mask, original_mask).getbbox() is not None
    return updated_mask, changed


def apply_soft_brush(
    mask_path: Path,
    *,
    points: list[BrushPoint],
    size: float,
    softness: float,
    tool: str,
) -> bool:
    updated_mask, changed = render_soft_brush(
        mask_path,
        points=points,
        size=size,
        softness=softness,
        tool=tool,
    )
    if changed:
        updated_mask.save(mask_path, format="PNG")
    return changed
