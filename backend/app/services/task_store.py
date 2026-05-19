import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from PIL import Image
from pydantic import ValidationError

from app.schemas.tasks import ExportSettings, TaskMetadata, TaskMode, TaskRecord

TASK_METADATA_READ_ERRORS = (
    FileNotFoundError,
    ValidationError,
    json.JSONDecodeError,
    OSError,
    ValueError,
    KeyError,
    TypeError,
)


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

    def has_editable_assets(self, task_id: str) -> bool:
        record = self.build_task_record(task_id)
        required_paths = (
            Path(record.source_rgb_path),
            Path(record.working_mask_path),
            Path(record.preview_rgba_path),
        )
        return all(path.exists() for path in required_paths)

    def history_dir(self, task_id: str) -> Path:
        return Path(self.build_task_record(task_id).task_dir) / ".history"

    def legacy_history_dir(self, task_id: str) -> Path:
        return Path(self.build_task_record(task_id).task_dir) / "temp" / "history"

    def resolve_history_snapshot_path(self, task_id: str, snapshot_path: str) -> Path:
        history_dir = self.history_dir(task_id).resolve()
        legacy_history_dir = self.legacy_history_dir(task_id).resolve()
        resolved_path = Path(snapshot_path).resolve()
        try:
            resolved_path.relative_to(history_dir)
            return resolved_path
        except ValueError:
            pass

        try:
            resolved_path.relative_to(legacy_history_dir)
        except ValueError as exc:
            raise ValueError("History snapshot path is outside task history storage") from exc

        normalized_path = history_dir / resolved_path.name
        if resolved_path.exists():
            if not normalized_path.exists():
                history_dir.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(resolved_path, normalized_path)
            return normalized_path
        return resolved_path

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
            history_cursor=-1,
            edge_refinement_enabled=False,
        )
        self.write_metadata(record, metadata)
        return record

    def clone_task_as_saved_version(self, source_task_id: str) -> TaskRecord:
        source_record = self.build_task_record(source_task_id)
        source_metadata = self.read_metadata(source_task_id)
        cloned_record = self.build_task_record(uuid4().hex)
        cloned_task_dir = Path(cloned_record.task_dir)
        cloned_task_dir.mkdir(parents=True, exist_ok=True)

        try:
            source_files = [
                ("original_path", source_record.original_path),
                ("source_rgb_path", source_record.source_rgb_path),
                ("auto_mask_path", source_record.auto_mask_path),
                ("working_mask_path", source_record.working_mask_path),
                ("preview_rgba_path", source_record.preview_rgba_path),
            ]
            for _, source_path in source_files:
                source_file = Path(source_path)
                if source_file.exists():
                    shutil.copyfile(source_file, cloned_task_dir / source_file.name)

            now = utc_now_iso()
            cloned_metadata = TaskMetadata(
                task_id=cloned_record.task_id,
                created_at=now,
                updated_at=now,
                mode=source_metadata.mode,
                status="ready",
                original_image_size=source_metadata.original_image_size,
                current_mask_path=cloned_record.working_mask_path,
                background_settings=source_metadata.background_settings,
                export_settings=source_metadata.export_settings,
                edit_history=[],
                history_cursor=-1,
                edge_refinement_enabled=source_metadata.edge_refinement_enabled,
            )
            self.write_metadata(cloned_record, cloned_metadata)
            return cloned_record
        except Exception:
            shutil.rmtree(cloned_task_dir, ignore_errors=True)
            raise

    def reset_task_to_initial_state(self, task_id: str) -> TaskMetadata:
        record = self.build_task_record(task_id)
        metadata = self.read_metadata(task_id)
        history_dir = self.history_dir(task_id)
        if history_dir.exists():
            shutil.rmtree(history_dir, ignore_errors=True)

        source_rgb_path = Path(record.source_rgb_path)
        working_mask_path = Path(record.working_mask_path)
        if metadata.mode == "auto" and Path(record.auto_mask_path).exists():
            shutil.copyfile(record.auto_mask_path, working_mask_path)
        else:
            with Image.open(source_rgb_path) as source_image:
                Image.new("L", source_image.size, color=255).save(working_mask_path, format="PNG")

        self.update_metadata(
            task_id,
            current_mask_path=record.working_mask_path,
            edit_history=[],
            history_cursor=-1,
        )
        return self.push_history_snapshot(task_id)

    def read_metadata(self, task_id: str) -> TaskMetadata:
        record = self.build_task_record(task_id)
        project_json_path = Path(record.project_json_path)
        project_json_text = project_json_path.read_text(encoding="utf-8")
        try:
            metadata = TaskMetadata.model_validate_json(project_json_text)
        except ValidationError:
            raw_metadata = json.loads(project_json_text)
            metadata = self._upgrade_legacy_metadata(record, raw_metadata)

        normalized_metadata = self._normalize_history_snapshot_paths(record, metadata)
        if normalized_metadata != metadata:
            self.write_metadata(record, normalized_metadata)
        return normalized_metadata

    def write_metadata(self, record: TaskRecord, metadata: TaskMetadata) -> None:
        project_json_path = Path(record.project_json_path)
        temp_project_json_path = project_json_path.with_name(
            f"{project_json_path.name}.{uuid4().hex}.tmp"
        )
        payload = metadata.model_dump(mode="json")
        if metadata.export_settings == ExportSettings():
            payload["export_settings"] = {}
        temp_project_json_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
        temp_project_json_path.replace(project_json_path)

    def update_metadata(self, task_id: str, **changes: object) -> TaskMetadata:
        record = self.build_task_record(task_id)
        metadata = self.read_metadata(task_id)
        updated_metadata = TaskMetadata.model_validate(
            {
                **metadata.model_dump(mode="python"),
                **changes,
                "updated_at": utc_now_iso(),
            }
        )
        self.write_metadata(record, updated_metadata)
        return updated_metadata

    def list_task_metadata(self) -> list[TaskMetadata]:
        metadata_list: list[TaskMetadata] = []
        for project_json_path in self.base_dir.glob("*/project.json"):
            try:
                metadata = self.read_metadata(project_json_path.parent.name)
            except TASK_METADATA_READ_ERRORS:
                continue
            if metadata.status != "ready":
                continue
            if not self.has_editable_assets(metadata.task_id):
                continue
            metadata_list.append(metadata)
        metadata_list.sort(key=lambda metadata: metadata.updated_at, reverse=True)
        return metadata_list

    def push_history_snapshot(self, task_id: str) -> TaskMetadata:
        record = self.build_task_record(task_id)
        metadata = self.read_metadata(task_id)
        working_mask_path = Path(record.working_mask_path)
        if not working_mask_path.exists():
            raise FileNotFoundError(working_mask_path)

        history_dir = self.history_dir(task_id)
        history_dir.mkdir(parents=True, exist_ok=True)

        next_history = metadata.edit_history[: metadata.history_cursor + 1]
        for stale_entry in metadata.edit_history[metadata.history_cursor + 1 :]:
            try:
                stale_mask_path = self.resolve_history_snapshot_path(
                    task_id,
                    str(stale_entry.get("mask_path", "")),
                )
            except ValueError:
                continue
            if stale_mask_path.exists():
                stale_mask_path.unlink()

        snapshot_path = history_dir / f"{len(next_history):04d}.png"
        shutil.copyfile(working_mask_path, snapshot_path)
        next_history.append({"mask_path": str(snapshot_path)})

        return self.update_metadata(
            task_id,
            current_mask_path=record.working_mask_path,
            edit_history=next_history,
            history_cursor=len(next_history) - 1,
        )

    def restore_history_snapshot(self, task_id: str, direction: int) -> TaskMetadata:
        record = self.build_task_record(task_id)
        metadata = self.read_metadata(task_id)
        next_cursor = metadata.history_cursor + direction
        if next_cursor < 0 or next_cursor >= len(metadata.edit_history):
            raise IndexError("History cursor out of bounds")

        try:
            snapshot_path = self.resolve_history_snapshot_path(
                task_id,
                str(metadata.edit_history[next_cursor].get("mask_path", "")),
            )
        except ValueError as exc:
            raise FileNotFoundError("Invalid history snapshot path") from exc
        if not snapshot_path.exists():
            raise FileNotFoundError(snapshot_path)

        shutil.copyfile(snapshot_path, record.working_mask_path)
        return self.update_metadata(
            task_id,
            current_mask_path=record.working_mask_path,
            history_cursor=next_cursor,
        )

    @staticmethod
    def can_undo(metadata: TaskMetadata) -> bool:
        return metadata.history_cursor > 0

    @staticmethod
    def can_redo(metadata: TaskMetadata) -> bool:
        return 0 <= metadata.history_cursor < len(metadata.edit_history) - 1

    def clear_temporary_state(self, exclude_task_id: str) -> None:
        for task_dir in self.base_dir.iterdir():
            if not task_dir.is_dir() or task_dir.name == exclude_task_id:
                continue

            temp_dir = task_dir / "temp"
            if temp_dir.exists():
                for child in temp_dir.iterdir():
                    if child.name == "history":
                        continue
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    else:
                        child.unlink(missing_ok=True)
                if not any(temp_dir.iterdir()):
                    temp_dir.rmdir()

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
            "history_cursor": raw_metadata.get(
                "history_cursor",
                len(raw_metadata.get("edit_history", [])) - 1,
            ),
            "edge_refinement_enabled": raw_metadata.get("edge_refinement_enabled", False),
        }
        return TaskMetadata.model_validate(normalized_metadata)

    def _normalize_history_snapshot_paths(
        self,
        record: TaskRecord,
        metadata: TaskMetadata,
    ) -> TaskMetadata:
        normalized_history: list[dict[str, object]] = []
        changed = False
        for entry in metadata.edit_history:
            snapshot_path = str(entry.get("mask_path", ""))
            try:
                normalized_path = self.resolve_history_snapshot_path(record.task_id, snapshot_path)
            except ValueError:
                normalized_history.append(entry)
                continue

            normalized_entry = dict(entry)
            normalized_path_str = str(normalized_path)
            if normalized_entry.get("mask_path") != normalized_path_str:
                normalized_entry["mask_path"] = normalized_path_str
                changed = True
            normalized_history.append(normalized_entry)

        if not changed:
            return metadata

        return metadata.model_copy(update={"edit_history": normalized_history})
