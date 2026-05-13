from pathlib import Path

from app.utils.image_io import load_image


def normalize_upload_to_rgb(upload_path: Path, output_path: Path) -> None:
    if upload_path.resolve() == output_path.resolve():
        raise ValueError("upload_path and output_path must be different files")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with load_image(upload_path) as image:
        image.convert("RGB").save(output_path, format="PNG")
