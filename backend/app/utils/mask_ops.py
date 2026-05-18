import math
from collections.abc import Iterable

import numpy as np
from PIL import Image, ImageDraw


def draw_binary_brush(
    mask_image: Image.Image,
    *,
    x: int,
    y: int,
    radius: int,
    mode: str,
) -> Image.Image:
    if mode not in {"add", "remove"}:
        raise ValueError(f"Unsupported binary brush mode: {mode}")

    editable_mask = mask_image.convert("L")
    fill = 255 if mode == "add" else 0
    bounds = (x - radius, y - radius, x + radius, y + radius)
    ImageDraw.Draw(editable_mask).ellipse(bounds, fill=fill)
    return editable_mask


def _soft_brush_weights(
    width: int,
    height: int,
    *,
    center_x: float,
    center_y: float,
    radius: float,
    softness: float,
) -> tuple[slice, slice, np.ndarray] | None:
    left = max(int(math.floor(center_x - radius)), 0)
    top = max(int(math.floor(center_y - radius)), 0)
    right = min(int(math.ceil(center_x + radius)) + 1, width)
    bottom = min(int(math.ceil(center_y + radius)) + 1, height)
    if left >= right or top >= bottom:
        return None

    y_coords, x_coords = np.ogrid[top:bottom, left:right]
    distances = np.sqrt((x_coords - center_x) ** 2 + (y_coords - center_y) ** 2)
    inner_radius = radius * (1.0 - softness)

    if softness <= 0:
        weights = (distances <= radius).astype(np.float32)
    else:
        weights = np.clip((radius - distances) / max(radius - inner_radius, 1e-6), 0.0, 1.0)
        weights[distances <= inner_radius] = 1.0

    return slice(top, bottom), slice(left, right), weights.astype(np.float32)


def _soft_segment_weights(
    width: int,
    height: int,
    *,
    start_x: float,
    start_y: float,
    end_x: float,
    end_y: float,
    radius: float,
    softness: float,
) -> tuple[slice, slice, np.ndarray] | None:
    left = max(int(math.floor(min(start_x, end_x) - radius)), 0)
    top = max(int(math.floor(min(start_y, end_y) - radius)), 0)
    right = min(int(math.ceil(max(start_x, end_x) + radius)) + 1, width)
    bottom = min(int(math.ceil(max(start_y, end_y) + radius)) + 1, height)
    if left >= right or top >= bottom:
        return None

    y_coords, x_coords = np.ogrid[top:bottom, left:right]
    dx = end_x - start_x
    dy = end_y - start_y
    segment_length_squared = (dx * dx) + (dy * dy)

    if segment_length_squared == 0:
        distances = np.sqrt((x_coords - start_x) ** 2 + (y_coords - start_y) ** 2)
    else:
        projection = ((x_coords - start_x) * dx + (y_coords - start_y) * dy) / segment_length_squared
        projection = np.clip(projection, 0.0, 1.0)
        closest_x = start_x + (projection * dx)
        closest_y = start_y + (projection * dy)
        distances = np.sqrt((x_coords - closest_x) ** 2 + (y_coords - closest_y) ** 2)

    inner_radius = radius * (1.0 - softness)
    if softness <= 0:
        weights = (distances <= radius).astype(np.float32)
    else:
        weights = np.clip((radius - distances) / max(radius - inner_radius, 1e-6), 0.0, 1.0)
        weights[distances <= inner_radius] = 1.0

    return slice(top, bottom), slice(left, right), weights.astype(np.float32)


def _stroke_bounds(
    points: list[tuple[float, float]],
    *,
    radius: float,
    width: int,
    height: int,
) -> tuple[int, int, int, int] | None:
    min_x = min(point[0] for point in points)
    max_x = max(point[0] for point in points)
    min_y = min(point[1] for point in points)
    max_y = max(point[1] for point in points)
    left = max(int(math.floor(min_x - radius)), 0)
    top = max(int(math.floor(min_y - radius)), 0)
    right = min(int(math.ceil(max_x + radius)) + 1, width)
    bottom = min(int(math.ceil(max_y + radius)) + 1, height)
    if left >= right or top >= bottom:
        return None
    return left, top, right, bottom


def draw_soft_brush(
    mask_image: Image.Image,
    *,
    points: Iterable[tuple[float, float]],
    size: float,
    softness: float,
    mode: str,
) -> Image.Image:
    if mode not in {"add", "remove"}:
        raise ValueError(f"Unsupported soft brush mode: {mode}")

    editable_mask = np.asarray(mask_image.convert("L"), dtype=np.float32)
    point_list = list(points)
    if not point_list:
        return Image.fromarray(editable_mask.astype(np.uint8), mode="L")

    radius = size / 2.0
    height, width = editable_mask.shape
    stroke_bounds = _stroke_bounds(
        point_list,
        radius=radius,
        width=width,
        height=height,
    )
    if stroke_bounds is None:
        return Image.fromarray(editable_mask.astype(np.uint8), mode="L")

    left, top, right, bottom = stroke_bounds
    editable_roi = editable_mask[top:bottom, left:right].copy()
    stroke_weights = np.zeros_like(editable_roi, dtype=np.float32)

    if len(point_list) == 1:
        point_x, point_y = point_list[0]
        weight_data = _soft_brush_weights(
            right - left,
            bottom - top,
            center_x=point_x - left,
            center_y=point_y - top,
            radius=radius,
            softness=softness,
        )
        if weight_data is not None:
            row_slice, col_slice, weights = weight_data
            stroke_weights[row_slice, col_slice] = np.maximum(
                stroke_weights[row_slice, col_slice],
                weights,
            )
    else:
        for start, end in zip(point_list, point_list[1:]):
            weight_data = _soft_segment_weights(
                right - left,
                bottom - top,
                start_x=start[0] - left,
                start_y=start[1] - top,
                end_x=end[0] - left,
                end_y=end[1] - top,
                radius=radius,
                softness=softness,
            )
            if weight_data is None:
                continue

            row_slice, col_slice, weights = weight_data
            stroke_weights[row_slice, col_slice] = np.maximum(
                stroke_weights[row_slice, col_slice],
                weights,
            )

    if mode == "add":
        editable_roi = editable_roi + ((255.0 - editable_roi) * stroke_weights)
    else:
        editable_roi = editable_roi - (editable_roi * stroke_weights)

    editable_mask[top:bottom, left:right] = editable_roi
    return Image.fromarray(editable_mask.clip(0, 255).astype(np.uint8), mode="L")
