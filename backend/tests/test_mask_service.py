from pathlib import Path

from PIL import Image

from app.services.mask_service import apply_binary_brush


def test_apply_binary_brush_updates_mask_pixels(tmp_path: Path) -> None:
    mask_path = tmp_path / "working_mask.png"
    Image.new("L", (8, 8), 0).save(mask_path)

    apply_binary_brush(mask_path, x=4, y=4, radius=2, mode="add")

    with Image.open(mask_path) as result:
        assert result.getpixel((4, 4)) == 255
