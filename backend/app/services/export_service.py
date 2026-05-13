from pathlib import Path

from PIL import Image


def export_rgba(source_path: Path, mask_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as source_image:
        source = source_image.convert("RGBA")
    with Image.open(mask_path) as mask_image:
        mask = mask_image.convert("L")
    source.putalpha(mask)
    source.save(output_path, format="PNG")


def _parse_background_hex(background_hex: str) -> tuple[int, int, int]:
    if len(background_hex) != 7 or not background_hex.startswith("#"):
        raise ValueError("background_hex must be in #RRGGBB format")
    return (
        int(background_hex[1:3], 16),
        int(background_hex[3:5], 16),
        int(background_hex[5:7], 16),
    )


def export_rgb_white(
    source_path: Path,
    mask_path: Path,
    output_path: Path,
    background_hex: str = "#FFFFFF",
) -> None:
    with Image.open(source_path) as source_image:
        source = source_image.convert("RGB")
    with Image.open(mask_path) as mask_image:
        mask = mask_image.convert("L")
    background = Image.new("RGB", source.size, _parse_background_hex(background_hex))
    foreground = Image.composite(source, background, mask)
    foreground.save(output_path, format="JPEG")
