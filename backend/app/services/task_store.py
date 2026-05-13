import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.schemas.tasks import TaskRecord


class TaskStore:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def create_task(self) -> TaskRecord:
        task_id = uuid4().hex
        task_dir = self.base_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        project_json_path = task_dir / "project.json"

        record = TaskRecord(
            task_id=task_id,
            task_dir=str(task_dir),
            original_path=str(task_dir / "original.png"),
            source_rgb_path=str(task_dir / "source_rgb.png"),
            auto_mask_path=str(task_dir / "auto_mask.png"),
            working_mask_path=str(task_dir / "working_mask.png"),
            preview_rgba_path=str(task_dir / "preview_rgba.png"),
            project_json_path=str(project_json_path),
        )

        metadata = {
            "task_id": task_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "created",
            "original_image_size": None,
            "current_mask_path": record.working_mask_path,
            "background_settings": {},
            "export_settings": {},
            "edit_history": [],
            "edge_refinement_enabled": False,
        }
        temp_project_json_path = project_json_path.with_name(
            f"{project_json_path.name}.{uuid4().hex}.tmp"
        )
        temp_project_json_path.write_text(
            json.dumps(metadata, indent=2),
            encoding="utf-8",
        )
        temp_project_json_path.replace(project_json_path)
        return record
