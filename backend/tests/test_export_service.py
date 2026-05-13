from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app
from app.services.export_service import export_rgb_white, export_rgba


def test_export_rgba_applies_mask_as_alpha(tmp_path: Path) -> None:
    source = tmp_path / "source_rgb.png"
    mask = tmp_path / "working_mask.png"
    rgba_path = tmp_path / "result_rgba.png"

    image = Image.new("RGB", (2, 1), (0, 0, 0))
    image.putpixel((0, 0), (10, 20, 30))
    image.putpixel((1, 0), (40, 50, 60))
    image.save(source)

    alpha = Image.new("L", (2, 1), 0)
    alpha.putpixel((0, 0), 0)
    alpha.putpixel((1, 0), 255)
    alpha.save(mask)

    export_rgba(source, mask, rgba_path)

    with Image.open(rgba_path) as rgba_result:
        assert rgba_result.mode == "RGBA"
        assert rgba_result.getpixel((0, 0)) == (10, 20, 30, 0)
        assert rgba_result.getpixel((1, 0)) == (40, 50, 60, 255)


def test_export_rgb_white_uses_requested_background_color(tmp_path: Path) -> None:
    source = tmp_path / "source_rgb.png"
    mask = tmp_path / "working_mask.png"
    rgb_path = tmp_path / "result_rgb.jpg"

    image = Image.new("RGB", (20, 10), (100, 120, 140))
    image.save(source)

    alpha = Image.new("L", (20, 10), 0)
    for x in range(10):
        for y in range(10):
            alpha.putpixel((x, y), 255)
    alpha.save(mask)

    export_rgb_white(source, mask, rgb_path, "#00FF00")

    with Image.open(rgb_path) as rgb_result:
        assert rgb_result.mode == "RGB"
        left_pixel = rgb_result.getpixel((4, 5))
        right_pixel = rgb_result.getpixel((15, 5))

    assert left_pixel[0] in range(95, 106)
    assert left_pixel[1] in range(115, 126)
    assert left_pixel[2] in range(135, 146)
    assert right_pixel[0] in range(0, 16)
    assert right_pixel[1] in range(240, 256)
    assert right_pixel[2] in range(0, 16)


def test_export_endpoint_rejects_task_id_path_traversal(tmp_path: Path) -> None:
    settings = Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models")
    app = create_app(settings=settings, models=SimpleNamespace())
    client = TestClient(app)

    response = client.post(
        "/api/export",
        json={
            "task_id": "../escape",
            "format": "rgb",
            "background_hex": "#FFFFFF",
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid task_id"}
