from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app


class StubAutoSegmenter:
    def __init__(self) -> None:
        self.calls: list[tuple[Path, Path]] = []

    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        self.calls.append((source_rgb_path, output_mask_path))
        with Image.open(source_rgb_path) as image:
            mask = Image.new("L", image.size, color=0)
            mask.putpixel((0, 0), 0)
            mask.putpixel((1, 0), 128)
            mask.putpixel((2, 0), 255)
            mask.save(output_mask_path, format="PNG")


def test_auto_segment_creates_preview_with_expected_alpha(tmp_path: Path) -> None:
    stub_segmenter = StubAutoSegmenter()
    settings = Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models")
    app = create_app(
        settings=settings,
        models=SimpleNamespace(auto_segmenter=stub_segmenter),
    )
    client = TestClient(app)

    image_path = tmp_path / "upload.png"
    source = Image.new("RGB", (3, 1), (0, 0, 0))
    source.putpixel((0, 0), (10, 20, 30))
    source.putpixel((1, 0), (40, 50, 60))
    source.putpixel((2, 0), (70, 80, 90))
    source.save(image_path)

    with image_path.open("rb") as file_obj:
        response = client.post(
            "/api/segment/auto",
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "task_id" in payload
    assert payload["auto_mask"].endswith("auto_mask.png")
    assert payload["preview_rgba"].endswith("preview_rgba.png")
    assert len(stub_segmenter.calls) == 1

    task_dir = tmp_path / payload["task_id"]
    preview_path = task_dir / "preview_rgba.png"
    mask_path = task_dir / "auto_mask.png"
    assert preview_path.exists()
    assert mask_path.exists()

    with Image.open(preview_path) as preview:
        assert preview.mode == "RGBA"
        assert preview.getpixel((0, 0)) == (10, 20, 30, 0)
        assert preview.getpixel((1, 0)) == (40, 50, 60, 128)
        assert preview.getpixel((2, 0)) == (70, 80, 90, 255)

    preview_response = client.get(payload["preview_rgba"])
    mask_response = client.get(payload["auto_mask"])
    assert preview_response.status_code == 200
    assert mask_response.status_code == 200


def test_auto_segment_returns_browser_accessible_preview_url(tmp_path: Path) -> None:
    stub_segmenter = StubAutoSegmenter()
    settings = Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models")
    app = create_app(
        settings=settings,
        models=SimpleNamespace(auto_segmenter=stub_segmenter),
    )
    client = TestClient(app)

    image_path = tmp_path / "upload.png"
    Image.new("RGB", (3, 1), (255, 255, 255)).save(image_path)

    with image_path.open("rb") as file_obj:
        response = client.post(
            "/api/segment/auto",
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["preview_rgba"].startswith("/outputs/")
