from pathlib import Path
import math
from typing import Literal

from PIL import Image


Box = tuple[float, float, float, float]
IntBox = tuple[int, int, int, int]
AspectRatio = Literal["free", "1:1", "3:4", "4:5", "16:9"]
SizeMode = Literal["original-size", "crop-size"]


def _normalize_box(box: object) -> Box:
    if hasattr(box, "x0"):
        return (
            float(box.x0),
            float(box.y0),
            float(box.x1),
            float(box.y1),
        )
    x0, y0, x1, y1 = box
    return (float(x0), float(y0), float(x1), float(y1))


def _full_image_box(image_size: tuple[int, int]) -> Box:
    width, height = image_size
    return (0.0, 0.0, float(width), float(height))


def _box_to_ints(box: Box) -> IntBox:
    x0, y0, x1, y1 = box
    return (
        math.floor(x0),
        math.floor(y0),
        math.ceil(x1),
        math.ceil(y1),
    )


def resolve_mask_bounds(mask: Image.Image) -> IntBox | None:
    bounds = mask.convert("L").getbbox()
    if bounds is None:
        return None
    return bounds


def expand_box_with_padding(box: Box, padding_percent: float) -> Box:
    if padding_percent <= 0:
        return box

    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    pad_x = width * (padding_percent / 100.0)
    pad_y = height * (padding_percent / 100.0)
    return (x0 - pad_x, y0 - pad_y, x1 + pad_x, y1 + pad_y)


def resolve_target_ratio(
    aspect_ratio: AspectRatio,
    width: float,
    height: float,
) -> float | None:
    if aspect_ratio == "free" or width <= 0 or height <= 0:
        return None

    ratio_width, ratio_height = aspect_ratio.split(":")
    return float(ratio_width) / float(ratio_height)


def fit_box_to_ratio(box: Box, ratio: float | None) -> Box:
    if ratio is None or ratio <= 0:
        return box

    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    current_ratio = width / height
    center_x = (x0 + x1) / 2.0
    center_y = (y0 + y1) / 2.0

    if current_ratio < ratio:
        width = height * ratio
    elif current_ratio > ratio:
        height = width / ratio

    half_width = width / 2.0
    half_height = height / 2.0
    return (
        center_x - half_width,
        center_y - half_height,
        center_x + half_width,
        center_y + half_height,
    )


def clamp_box_to_image(box: Box, image_size: tuple[int, int]) -> Box:
    image_width, image_height = image_size
    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0

    if width >= image_width:
        x0 = 0.0
        x1 = float(image_width)
    else:
        if x0 < 0:
            x1 -= x0
            x0 = 0.0
        if x1 > image_width:
            shift = x1 - image_width
            x0 -= shift
            x1 = float(image_width)

    if height >= image_height:
        y0 = 0.0
        y1 = float(image_height)
    else:
        if y0 < 0:
            y1 -= y0
            y0 = 0.0
        if y1 > image_height:
            shift = y1 - image_height
            y0 -= shift
            y1 = float(image_height)

    return (x0, y0, x1, y1)


def resolve_export_crop(
    image_size: tuple[int, int],
    mask: Image.Image,
    crop_box: object | None = None,
    aspect_ratio: AspectRatio = "free",
    padding_percent: float = 12,
) -> IntBox:
    if crop_box is not None:
        return _box_to_ints(clamp_box_to_image(_normalize_box(crop_box), image_size))

    bounds = resolve_mask_bounds(mask)
    box = _normalize_box(bounds) if bounds is not None else _full_image_box(image_size)

    if box == _full_image_box(image_size):
        return _box_to_ints(box)

    box = expand_box_with_padding(box, padding_percent)
    ratio = resolve_target_ratio(aspect_ratio, box[2] - box[0], box[3] - box[1])
    box = fit_box_to_ratio(box, ratio)
    box = clamp_box_to_image(box, image_size)
    return _box_to_ints(box)


def _prepare_cropped_images(
    source: Image.Image,
    mask: Image.Image,
    crop_box: object | None,
    aspect_ratio: AspectRatio,
    padding_percent: float,
    size_mode: SizeMode,
) -> tuple[Image.Image, Image.Image]:
    resolved_crop = resolve_export_crop(
        image_size=source.size,
        mask=mask,
        crop_box=crop_box,
        aspect_ratio=aspect_ratio,
        padding_percent=padding_percent,
    )
    cropped_source = source.crop(resolved_crop)
    cropped_mask = mask.crop(resolved_crop)

    if size_mode == "original-size":
        cropped_source = cropped_source.resize(source.size, Image.Resampling.LANCZOS)
        cropped_mask = cropped_mask.resize(mask.size, Image.Resampling.NEAREST)

    return cropped_source, cropped_mask


def export_rgba(
    source_path: Path,
    mask_path: Path,
    output_path: Path,
    crop_box: object | None = None,
    aspect_ratio: AspectRatio = "free",
    padding_percent: float = 12,
    size_mode: SizeMode = "crop-size",
) -> None:
    with Image.open(source_path) as source_image:
        source = source_image.convert("RGBA")
    with Image.open(mask_path) as mask_image:
        mask = mask_image.convert("L")

    source, mask = _prepare_cropped_images(
        source=source,
        mask=mask,
        crop_box=crop_box,
        aspect_ratio=aspect_ratio,
        padding_percent=padding_percent,
        size_mode=size_mode,
    )
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
    crop_box: object | None = None,
    aspect_ratio: AspectRatio = "free",
    padding_percent: float = 12,
    size_mode: SizeMode = "crop-size",
) -> None:
    with Image.open(source_path) as source_image:
        source = source_image.convert("RGB")
    with Image.open(mask_path) as mask_image:
        mask = mask_image.convert("L")
    source, mask = _prepare_cropped_images(
        source=source,
        mask=mask,
        crop_box=crop_box,
        aspect_ratio=aspect_ratio,
        padding_percent=padding_percent,
        size_mode=size_mode,
    )
    background = Image.new("RGB", source.size, _parse_background_hex(background_hex))
    foreground = Image.composite(source, background, mask)
    foreground.save(output_path, format="JPEG")
