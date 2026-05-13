from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app

class StubAutoSegmenter:
    def segment(self, source_rgb_path: Path, output_mask_path: Path) -> None:
        with Image.open(source_rgb_path) as image:
            Image.new("L", image.size, color=255).save(output_mask_path, format="PNG")


class StubInteractiveSegmenter:
    def refine(
        self,
        source_rgb_path: Path,
        working_mask_path: Path,
        points: list[object],
        boxes: list[dict[str, float]],
    ) -> Path:
        del source_rgb_path, points, boxes
        if not working_mask_path.exists():
            raise FileNotFoundError(working_mask_path)
        return working_mask_path


def test_interactive_segment_returns_updated_mask(tmp_path: Path) -> None:
    settings = Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models")
    client = TestClient(
        create_app(
            settings=settings,
            models=SimpleNamespace(
                auto_segmenter=StubAutoSegmenter(),
                interactive_segmenter=StubInteractiveSegmenter(),
            ),
        )
    )

    image_path = tmp_path / "upload.png"
    Image.new("RGB", (2, 2), (10, 20, 30)).save(image_path, format="PNG")

    with image_path.open("rb") as file_obj:
        auto_response = client.post(
            "/api/segment/auto",
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    assert auto_response.status_code == 200
    task_id = auto_response.json()["task_id"]

    response = client.post(
        "/api/segment/interactive",
        json={
            "task_id": task_id,
            "points": [{"x": 10, "y": 12, "type": "positive"}],
            "boxes": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["working_mask_path"].endswith("working_mask.png")


def test_interactive_segment_returns_404_for_missing_working_mask(tmp_path: Path) -> None:
    client = TestClient(
        create_app(settings=Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models"))
    )

    response = client.post(
        "/api/segment/interactive",
        json={
            "task_id": "missing-task",
            "points": [{"x": 10, "y": 12, "type": "positive"}],
            "boxes": [],
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "working_mask.png not found"}
