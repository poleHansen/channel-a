import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError

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
        self.clear_temporary_state(exclude_task_id=task_id)
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
        project_json_path = Path(record.project_json_path)
        project_json_text = project_json_path.read_text(encoding="utf-8")
        try:
            return TaskMetadata.model_validate_json(project_json_text)
        except ValidationError:
            raw_metadata = json.loads(project_json_text)
            return self._upgrade_legacy_metadata(record, raw_metadata)

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
            metadata_list.append(self.read_metadata(project_json_path.parent.name))
        metadata_list.sort(key=lambda metadata: metadata.updated_at, reverse=True)
        return metadata_list

    def clear_temporary_state(self, exclude_task_id: str) -> None:
        for task_dir in self.base_dir.iterdir():
            if not task_dir.is_dir() or task_dir.name == exclude_task_id:
                continue

            temp_dir = task_dir / "temp"
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

    def _upgrade_legacy_metadata(
        self,
        record: TaskRecord,
        raw_metadata: dict[str, object],
    ) -> TaskMetadata:
        created_at = str(raw_metadata["created_at"])
        preview_rgba_path = Path(record.preview_rgba_path)
        auto_mask_path = Path(record.auto_mask_path)
        working_mask_path = Path(record.working_mask_path)

        inferred_mode: TaskMode = "auto" if auto_mask_path.exists() else "manual"
        inferred_status = (
            "ready"
            if preview_rgba_path.exists() or working_mask_path.exists()
            else raw_metadata.get("status", "created")
        )

        normalized_metadata = {
            "task_id": raw_metadata["task_id"],
            "created_at": created_at,
            "updated_at": raw_metadata.get("updated_at", created_at),
            "mode": raw_metadata.get("mode", inferred_mode),
            "status": inferred_status,
            "original_image_size": raw_metadata.get("original_image_size"),
            "current_mask_path": raw_metadata.get("current_mask_path", record.working_mask_path),
            "background_settings": raw_metadata.get("background_settings", {}),
            "export_settings": raw_metadata.get("export_settings", {}),
            "edit_history": raw_metadata.get("edit_history", []),
            "edge_refinement_enabled": raw_metadata.get("edge_refinement_enabled", False),
        }
        return TaskMetadata.model_validate(normalized_metadata)
