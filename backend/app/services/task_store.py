import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.schemas.tasks import TaskMetadata, TaskMode, TaskRecord


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TaskStore:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def build_task_record(self, task_id: str) -> TaskRecord:
        task_dir = self.base_dir / task_id
        project_json_path = task_dir / "project.json"
        return TaskRecord(
            task_id=task_id,
            task_dir=str(task_dir),
            original_path=str(task_dir / "original.png"),
            source_rgb_path=str(task_dir / "source_rgb.png"),
            auto_mask_path=str(task_dir / "auto_mask.png"),
            working_mask_path=str(task_dir / "working_mask.png"),
            preview_rgba_path=str(task_dir / "preview_rgba.png"),
            project_json_path=str(project_json_path),
        )

    def create_task(self, mode: TaskMode = "auto") -> TaskRecord:
        task_id = uuid4().hex
        task_dir = self.base_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        record = self.build_task_record(task_id)

        now = utc_now_iso()
        metadata = TaskMetadata(
            task_id=task_id,
            created_at=now,
            updated_at=now,
            mode=mode,
            status="created",
            original_image_size=None,
            current_mask_path=record.working_mask_path,
            background_settings={},
            export_settings={},
            edit_history=[],
            edge_refinement_enabled=False,
        )
        self.write_metadata(record, metadata)
        return record

    def read_metadata(self, task_id: str) -> TaskMetadata:
        record = self.build_task_record(task_id)
        return TaskMetadata.model_validate_json(
            Path(record.project_json_path).read_text(encoding="utf-8")
        )

    def write_metadata(self, record: TaskRecord, metadata: TaskMetadata) -> None:
        project_json_path = Path(record.project_json_path)
        temp_project_json_path = project_json_path.with_name(
            f"{project_json_path.name}.{uuid4().hex}.tmp"
        )
        temp_project_json_path.write_text(
            json.dumps(metadata.model_dump(mode="json"), indent=2),
            encoding="utf-8",
        )
        temp_project_json_path.replace(project_json_path)

    def update_metadata(self, task_id: str, **changes: object) -> TaskMetadata:
        record = self.build_task_record(task_id)
        metadata = self.read_metadata(task_id)
        updated_metadata = metadata.model_copy(
            update={
                **changes,
                "updated_at": utc_now_iso(),
            }
        )
        self.write_metadata(record, updated_metadata)
        return updated_metadata

    def list_task_metadata(self) -> list[TaskMetadata]:
        metadata_list: list[TaskMetadata] = []
        for project_json_path in self.base_dir.glob("*/project.json"):
            metadata_list.append(
                TaskMetadata.model_validate_json(
                    project_json_path.read_text(encoding="utf-8")
                )
            )
        metadata_list.sort(key=lambda metadata: metadata.updated_at, reverse=True)
        return metadata_list
