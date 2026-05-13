from PIL import Image, ImageDraw


def draw_binary_brush(
    mask_image: Image.Image,
    *,
    x: int,
    y: int,
    radius: int,
    mode: str,
) -> Image.Image:
    editable_mask = mask_image.convert("L")
    fill = 255 if mode == "add" else 0
    bounds = (x - radius, y - radius, x + radius, y + radius)
    ImageDraw.Draw(editable_mask).ellipse(bounds, fill=fill)
    return editable_mask
