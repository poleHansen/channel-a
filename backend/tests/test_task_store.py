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


def test_read_metadata_upgrades_legacy_project_json(tmp_path: Path) -> None:
    store = TaskStore(base_dir=tmp_path / "tasks")
    task_id = "legacy-task"
    task_dir = (tmp_path / "tasks" / task_id).resolve()
    task_dir.mkdir(parents=True)
    (task_dir / "auto_mask.png").write_bytes(b"legacy-auto-mask")
    (task_dir / "preview_rgba.png").write_bytes(b"legacy-preview")
    (task_dir / "working_mask.png").write_bytes(b"legacy-working-mask")
    legacy_metadata = {
        "task_id": task_id,
        "created_at": "2026-05-16T11:14:02.773913+00:00",
        "status": "created",
        "original_image_size": None,
        "current_mask_path": str(task_dir / "working_mask.png"),
        "background_settings": {},
        "export_settings": {},
        "edit_history": [],
        "edge_refinement_enabled": False,
    }
    (task_dir / "project.json").write_text(
        json.dumps(legacy_metadata, indent=2),
        encoding="utf-8",
    )

    metadata = store.read_metadata(task_id)

    assert metadata.task_id == task_id
    assert metadata.created_at == legacy_metadata["created_at"]
    assert metadata.updated_at == legacy_metadata["created_at"]
    assert metadata.mode == "auto"
    assert metadata.status == "ready"
