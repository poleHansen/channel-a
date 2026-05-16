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
            Image.new("L", image.size, color=255).save(output_mask_path, format="PNG")


def test_create_manual_task_keeps_original_preview_without_auto_segment(tmp_path: Path) -> None:
    stub_segmenter = StubAutoSegmenter()
    client = TestClient(
        create_app(
            settings=Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models"),
            models=SimpleNamespace(auto_segmenter=stub_segmenter),
        )
    )

    image_path = tmp_path / "upload.png"
    Image.new("RGB", (3, 2), (10, 20, 30)).save(image_path, format="PNG")

    with image_path.open("rb") as file_obj:
        response = client.post(
            "/api/tasks",
            data={"mode": "manual"},
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "manual"
    assert payload["preview_rgba"].startswith("/outputs/")
    assert payload["status"] == "ready"
    assert stub_segmenter.calls == []

    with Image.open(tmp_path / payload["task_id"] / "preview_rgba.png") as preview:
        assert preview.getpixel((0, 0)) == (10, 20, 30, 255)


def test_list_tasks_returns_recent_tasks_with_preview(tmp_path: Path) -> None:
    stub_segmenter = StubAutoSegmenter()
    client = TestClient(
        create_app(
            settings=Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models"),
            models=SimpleNamespace(auto_segmenter=stub_segmenter),
        )
    )

    first_image = tmp_path / "first.png"
    second_image = tmp_path / "second.png"
    Image.new("RGB", (2, 2), (10, 20, 30)).save(first_image, format="PNG")
    Image.new("RGB", (2, 2), (40, 50, 60)).save(second_image, format="PNG")

    with first_image.open("rb") as file_obj:
        first_response = client.post(
            "/api/tasks",
            data={"mode": "manual"},
            files={"file": ("first.png", file_obj, "image/png")},
        )
    with second_image.open("rb") as file_obj:
        second_response = client.post(
            "/api/tasks",
            data={"mode": "auto"},
            files={"file": ("second.png", file_obj, "image/png")},
        )

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    response = client.get("/api/tasks")

    assert response.status_code == 200
    tasks = response.json()["tasks"]
    assert [task["task_id"] for task in tasks] == [
        second_response.json()["task_id"],
        first_response.json()["task_id"],
    ]
    assert tasks[0]["preview_rgba"].startswith("/outputs/")
    assert tasks[0]["mode"] == "auto"
    assert tasks[1]["mode"] == "manual"


def test_get_task_returns_current_preview_and_mode(tmp_path: Path) -> None:
    stub_segmenter = StubAutoSegmenter()
    client = TestClient(
        create_app(
            settings=Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models"),
            models=SimpleNamespace(auto_segmenter=stub_segmenter),
        )
    )

    image_path = tmp_path / "upload.png"
    Image.new("RGB", (2, 2), (70, 80, 90)).save(image_path, format="PNG")

    with image_path.open("rb") as file_obj:
        create_response = client.post(
            "/api/tasks",
            data={"mode": "auto"},
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    task_id = create_response.json()["task_id"]
    response = client.get(f"/api/tasks/{task_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["task_id"] == task_id
    assert payload["mode"] == "auto"
    assert payload["preview_rgba"].startswith("/outputs/")
    assert payload["status"] == "ready"


def test_auto_segment_existing_task_updates_manual_task(tmp_path: Path) -> None:
    stub_segmenter = StubAutoSegmenter()
    client = TestClient(
        create_app(
            settings=Settings(outputs_dir=tmp_path, models_dir=tmp_path / "models"),
            models=SimpleNamespace(auto_segmenter=stub_segmenter),
        )
    )

    image_path = tmp_path / "upload.png"
    Image.new("RGB", (2, 2), (100, 110, 120)).save(image_path, format="PNG")

    with image_path.open("rb") as file_obj:
        create_response = client.post(
            "/api/tasks",
            data={"mode": "manual"},
            files={"file": ("upload.png", file_obj, "image/png")},
        )

    task_id = create_response.json()["task_id"]
    response = client.post(f"/api/tasks/{task_id}/auto-segment")

    assert response.status_code == 200
    payload = response.json()
    assert payload["task_id"] == task_id
    assert payload["mode"] == "auto"
    assert payload["preview_rgba"].startswith("/outputs/")
    assert len(stub_segmenter.calls) == 1
