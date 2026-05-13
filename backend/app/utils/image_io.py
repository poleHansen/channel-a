from pathlib import Path

from PIL import Image, ImageOps


def load_image(path: Path) -> Image.Image:
    image = Image.open(path)
    return ImageOps.exif_transpose(image)
