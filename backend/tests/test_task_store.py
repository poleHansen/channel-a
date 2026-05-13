import json
from pathlib import Path

from app.services.task_store import TaskStore


def test_create_task_creates_expected_files_and_project_metadata(
    tmp_path: Path,
) -> None:
    store = TaskStore(base_dir=tmp_path / "tasks")

    task = store.create_task()

    task_dir = (tmp_path / "tasks" / task.task_id).resolve()
    assert task_dir.exists()
    assert task.task_dir == str(task_dir)
    assert task.original_path == str(task_dir / "original.png")
    assert task.source_rgb_path == str(task_dir / "source_rgb.png")
    assert task.auto_mask_path == str(task_dir / "auto_mask.png")
    assert task.working_mask_path == str(task_dir / "working_mask.png")
    assert task.preview_rgba_path == str(task_dir / "preview_rgba.png")
    assert task.project_json_path == str(task_dir / "project.json")

    project_json_path = task_dir / "project.json"
    assert project_json_path.exists()

    project_data = json.loads(project_json_path.read_text(encoding="utf-8"))
    assert project_data["task_id"] == task.task_id
    assert project_data["created_at"]
    assert project_data["status"] == "created"
    assert project_data["original_image_size"] is None
    assert project_data["current_mask_path"] == task.working_mask_path
    assert project_data["background_settings"] == {}
    assert project_data["export_settings"] == {}
    assert project_data["edit_history"] == []
    assert project_data["edge_refinement_enabled"] is False
