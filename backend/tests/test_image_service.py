from pathlib import Path

import pytest
from PIL import Image

from app.services.image_service import normalize_upload_to_rgb
from app.utils.image_io import load_image


def test_load_image_applies_exif_orientation(tmp_path: Path) -> None:
    upload_path = tmp_path / "input.jpg"
    exif = Image.Exif()
    exif[274] = 6
    Image.new("RGB", (8, 16), (10, 20, 30)).save(upload_path, exif=exif)

    with load_image(upload_path) as result:
        assert result.size == (16, 8)


def test_normalize_upload_to_rgb_creates_rgb_png(tmp_path: Path) -> None:
    upload_path = tmp_path / "input.png"
    Image.new("RGBA", (16, 16), (10, 20, 30, 128)).save(upload_path)
    output_path = tmp_path / "source_rgb.png"

    normalize_upload_to_rgb(upload_path, output_path)

    with Image.open(output_path) as result:
        assert result.mode == "RGB"
        assert result.size == (16, 16)


def test_normalize_upload_to_rgb_rejects_same_input_and_output_path(
    tmp_path: Path,
) -> None:
    upload_path = tmp_path / "input.png"
    Image.new("RGBA", (16, 16), (10, 20, 30, 128)).save(upload_path)

    with pytest.raises(ValueError, match="must be different"):
        normalize_upload_to_rgb(upload_path, upload_path)
