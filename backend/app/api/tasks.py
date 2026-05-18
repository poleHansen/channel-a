import shutil
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

from app.api.segment import (
    _build_output_url,
    _resolve_task_dir,
    _write_preview_rgba,
)
from app.schemas.segment import BrushApplyRequest, InteractiveSegmentResponse
from app.schemas.tasks import (
    SaveTaskResponse,
    TaskListResponse,
    TaskMode,
    TaskResponse,
    TaskSummary,
)
from app.services.image_service import normalize_upload_to_rgb
from app.services.mask_service import render_soft_brush
from app.services.task_store import TASK_METADATA_READ_ERRORS, TaskStore

router = APIRouter(prefix="/tasks")
@dataclass
class _TaskStateLockEntry:
    lock: threading.Lock
    holders: int = 0

_task_state_locks: dict[str, _TaskStateLockEntry] = {}
_task_state_locks_guard = threading.Lock()


def _acquire_task_state_lock_entry(task_id: str) -> _TaskStateLockEntry:
    with _task_state_locks_guard:
        entry = _task_state_locks.get(task_id)
        if entry is None:
            entry = _TaskStateLockEntry(lock=threading.Lock())
            _task_state_locks[task_id] = entry
        entry.holders += 1
        return entry


@contextmanager
def _task_state_lock(task_id: str):
    entry = _acquire_task_state_lock_entry(task_id)
    try:
        with entry.lock:
            yield
    finally:
        with _task_state_locks_guard:
            entry.holders -= 1
            if entry.holders == 0 and _task_state_locks.get(task_id) is entry:
                _task_state_locks.pop(task_id, None)


def _get_task_state_lock(task_id: str) -> threading.Lock:
    entry = _acquire_task_state_lock_entry(task_id)
    with _task_state_locks_guard:
        entry.holders -= 1
        if entry.holders == 0 and _task_state_locks.get(task_id) is entry:
            _task_state_locks.pop(task_id, None)
    return entry.lock


def _read_optional_bytes(path: Path) -> bytes | None:
    if path.exists():
        return path.read_bytes()
    return None


def _restore_optional_bytes(path: Path, data: bytes | None) -> None:
    if data is None:
        if path.exists():
            path.unlink()
        return
    path.write_bytes(data)


def _read_task_metadata_or_http(task_store: TaskStore, task_id: str):
    try:
        return task_store.read_metadata(task_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Task not found") from exc
    except TASK_METADATA_READ_ERRORS as exc:
        raise HTTPException(status_code=409, detail="Task metadata is invalid") from exc


@contextmanager
def _task_visible_state_transaction(
    task_store: TaskStore,
    task_id: str,
    *,
    restore_history_dir: bool = False,
    cleanup_paths: tuple[Path, ...] = (),
    restore_paths: tuple[Path, ...] = (),
):
    record = task_store.build_task_record(task_id)
    task_dir = Path(record.task_dir)
    working_mask_path = Path(record.working_mask_path)
    preview_rgba_path = Path(record.preview_rgba_path)
    project_json_path = Path(record.project_json_path)
    original_working_mask = _read_optional_bytes(working_mask_path)
    original_preview_rgba = _read_optional_bytes(preview_rgba_path)
    original_project_json = project_json_path.read_bytes()
    extra_path_bytes = {
        restore_path: _read_optional_bytes(restore_path)
        for restore_path in restore_paths
    }
    history_dir = task_store.history_dir(task_id)
    history_backup_dir: Path | None = None
    if restore_history_dir and history_dir.exists():
        history_backup_dir = task_dir / f".history-backup-{uuid4().hex}"
        shutil.copytree(history_dir, history_backup_dir)

    try:
        yield
    except Exception:
        _restore_optional_bytes(working_mask_path, original_working_mask)
        _restore_optional_bytes(preview_rgba_path, original_preview_rgba)
        project_json_path.write_bytes(original_project_json)
        for restore_path, restore_bytes in extra_path_bytes.items():
            _restore_optional_bytes(restore_path, restore_bytes)
        if restore_history_dir:
            if history_dir.exists():
                shutil.rmtree(history_dir, ignore_errors=True)
            if history_backup_dir is not None and history_backup_dir.exists():
                shutil.copytree(history_backup_dir, history_dir)
        for cleanup_path in cleanup_paths:
            if cleanup_path.is_dir():
                shutil.rmtree(cleanup_path, ignore_errors=True)
            elif cleanup_path.exists():
                cleanup_path.unlink()
        raise
    finally:
        if history_backup_dir is not None and history_backup_dir.exists():
            shutil.rmtree(history_backup_dir, ignore_errors=True)


@contextmanager
def _brush_transaction(
    task_store: TaskStore,
    task_id: str,
    metadata,
):
    record = task_store.build_task_record(task_id)
    task_dir = Path(record.task_dir)
    working_mask_path = Path(record.working_mask_path)
    preview_rgba_path = Path(record.preview_rgba_path)
    original_working_mask = working_mask_path.read_bytes()
    original_preview_rgba = _read_optional_bytes(preview_rgba_path)
    project_json_path = task_dir / "project.json"
    original_project_json = project_json_path.read_bytes()
    history_dir = task_store.history_dir(task_id)
    redo_snapshot_paths: list[Path] = []
    for entry in metadata.edit_history[metadata.history_cursor + 1 :]:
        try:
            redo_snapshot_paths.append(
                task_store.resolve_history_snapshot_path(
                    task_id,
                    str(entry.get("mask_path", "")),
                )
            )
        except ValueError:
            continue
    redo_snapshot_bytes = {
        path: path.read_bytes()
        for path in redo_snapshot_paths
        if path.exists()
    }
    next_snapshot_path = history_dir / f"{metadata.history_cursor + 1:04d}.png"

    try:
        yield
    except Exception:
        working_mask_path.write_bytes(original_working_mask)
        _restore_optional_bytes(preview_rgba_path, original_preview_rgba)
        project_json_path.write_bytes(original_project_json)
        if next_snapshot_path.exists() and next_snapshot_path not in redo_snapshot_bytes:
            next_snapshot_path.unlink()
        for path, snapshot_bytes in redo_snapshot_bytes.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(snapshot_bytes)
        raise
    finally:
        if history_dir.exists() and not any(history_dir.iterdir()):
            shutil.rmtree(history_dir, ignore_errors=True)


def _task_response_from_metadata(
    task_id: str,
    outputs_dir: Path,
    metadata,
) -> TaskResponse:
    task_dir = outputs_dir / task_id
    return TaskResponse(
        task_id=task_id,
        created_at=metadata.created_at,
        updated_at=metadata.updated_at,
        mode=metadata.mode,
        status=metadata.status,
        preview_rgba=_build_output_url(task_dir, "preview_rgba.png", outputs_dir),
        can_undo=TaskStore.can_undo(metadata),
        can_redo=TaskStore.can_redo(metadata),
    )


def _write_manual_preview(source_rgb_path: Path, preview_rgba_path: Path) -> None:
    with Image.open(source_rgb_path) as source_image:
        source_image.convert("RGBA").save(preview_rgba_path, format="PNG")


def _validate_source_rgb_for_task(source_rgb_path: Path) -> None:
    if not source_rgb_path.exists():
        raise HTTPException(status_code=404, detail="source_rgb.png not found")
    try:
        with Image.open(source_rgb_path) as source_image:
            source_image.convert("RGBA")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=409, detail="source_rgb.png is invalid") from exc


def _write_preview_rgba_with_task_state_guards(
    source_rgb_path: Path,
    working_mask_path: Path,
    preview_rgba_path: Path,
) -> None:
    _validate_source_rgb_for_task(source_rgb_path)
    if not working_mask_path.exists():
        raise HTTPException(status_code=404, detail="working_mask.png not found")

    try:
        with Image.open(working_mask_path) as mask_image:
            mask_image.convert("L")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=409, detail="working_mask.png is invalid") from exc

    _write_preview_rgba(source_rgb_path, working_mask_path, preview_rgba_path)


def _finalize_task_metadata(
    task_store: TaskStore,
    task_id: str,
    mode: TaskMode,
    source_rgb_path: Path,
    working_mask_path: Path,
) -> TaskResponse:
    with Image.open(source_rgb_path) as source_image:
        width, height = source_image.size

    metadata = task_store.update_metadata(
        task_id,
        mode=mode,
        status="ready",
        original_image_size={"width": width, "height": height},
        current_mask_path=str(working_mask_path),
    )
    return _task_response_from_metadata(task_id, task_store.base_dir, metadata)


def _run_auto_segment_for_task(request: Request, task_id: str) -> TaskResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    task = task_store.build_task_record(task_id)
    task_dir = Path(task.task_dir)
    _read_task_metadata_or_http(task_store, task_id)

    with _task_visible_state_transaction(
        task_store,
        task_id,
        restore_history_dir=True,
        restore_paths=(Path(task.auto_mask_path),),
    ):
        _validate_source_rgb_for_task(Path(task.source_rgb_path))
        try:
            request.app.state.models.auto_segmenter.segment(
                Path(task.source_rgb_path),
                Path(task.auto_mask_path),
            )
        except (OSError, RuntimeError) as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Auto cutout is unavailable: {exc}",
            ) from exc
        Path(task.working_mask_path).write_bytes(Path(task.auto_mask_path).read_bytes())
        _write_preview_rgba_with_task_state_guards(
            Path(task.source_rgb_path),
            Path(task.working_mask_path),
            Path(task.preview_rgba_path),
        )
        task_store.push_history_snapshot(task_id)
        return _finalize_task_metadata(
            task_store,
            task_id,
            "auto",
            Path(task.source_rgb_path),
            task_dir / "working_mask.png",
        )


@router.post("", response_model=TaskResponse)
async def create_task(
    request: Request,
    mode: TaskMode = Form(default="auto"),
    file: UploadFile = File(...),
) -> TaskResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    task = task_store.create_task(mode=mode)
    task_dir = Path(task.task_dir)

    try:
        original_path = Path(task.original_path)
        original_path.write_bytes(await file.read())
        normalize_upload_to_rgb(original_path, Path(task.source_rgb_path))
        with Image.open(task.source_rgb_path) as source_image:
            Image.new("L", source_image.size, color=255).save(task.working_mask_path, format="PNG")
        task_store.push_history_snapshot(task.task_id)

        if mode == "auto":
            return _run_auto_segment_for_task(request, task.task_id)

        _write_manual_preview(Path(task.source_rgb_path), Path(task.preview_rgba_path))

        return _finalize_task_metadata(
            task_store,
            task.task_id,
            "manual",
            Path(task.source_rgb_path),
            Path(task.working_mask_path),
        )
    except Exception:
        shutil.rmtree(task_dir, ignore_errors=True)
        raise


@router.get("", response_model=TaskListResponse)
def list_tasks(request: Request) -> TaskListResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    tasks = [
        TaskSummary(
            task_id=metadata.task_id,
            created_at=metadata.created_at,
            updated_at=metadata.updated_at,
            mode=metadata.mode,
            status=metadata.status,
            preview_rgba=_build_output_url(
                task_store.base_dir / metadata.task_id,
                "preview_rgba.png",
                task_store.base_dir,
            ),
            can_undo=TaskStore.can_undo(metadata),
            can_redo=TaskStore.can_redo(metadata),
        )
        for metadata in task_store.list_task_metadata()
    ]
    return TaskListResponse(tasks=tasks)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, request: Request) -> TaskResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    _resolve_task_dir(task_store.base_dir, task_id)
    metadata = _read_task_metadata_or_http(task_store, task_id)
    if metadata.status != "ready" or not task_store.has_editable_assets(task_id):
        raise HTTPException(status_code=409, detail="Task assets are incomplete")
    return _task_response_from_metadata(task_id, task_store.base_dir, metadata)


@router.post("/{task_id}/auto-segment", response_model=TaskResponse)
def auto_segment_existing_task(task_id: str, request: Request) -> TaskResponse:
    with _task_state_lock(task_id):
        task_store = TaskStore(request.app.state.settings.outputs_dir)
        _resolve_task_dir(task_store.base_dir, task_id)
        return _run_auto_segment_for_task(request, task_id)


@router.post("/{task_id}/brush", response_model=InteractiveSegmentResponse)
def apply_task_brush(
    task_id: str,
    payload: BrushApplyRequest,
    request: Request,
) -> InteractiveSegmentResponse:
    with _task_state_lock(task_id):
        task_store = TaskStore(request.app.state.settings.outputs_dir)
        task_dir = _resolve_task_dir(task_store.base_dir, task_id)
        metadata = _read_task_metadata_or_http(task_store, task_id)

        source_rgb_path = task_dir / "source_rgb.png"
        if not source_rgb_path.exists():
            raise HTTPException(status_code=404, detail="source_rgb.png not found")

        working_mask_path = task_dir / "working_mask.png"
        if not working_mask_path.exists():
            raise HTTPException(status_code=404, detail="working_mask.png not found")

        try:
            updated_mask, changed = render_soft_brush(
                working_mask_path,
                points=payload.stroke.points,
                size=payload.stroke.size,
                softness=payload.stroke.softness,
                tool=payload.stroke.tool,
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="working_mask.png not found") from exc
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=409, detail="working_mask.png is invalid") from exc
        if changed:
            with _brush_transaction(task_store, task_id, metadata):
                updated_mask.save(working_mask_path, format="PNG")
                _write_preview_rgba_with_task_state_guards(
                    source_rgb_path,
                    working_mask_path,
                    task_dir / "preview_rgba.png",
                )
                metadata = task_store.push_history_snapshot(task_id)

        return InteractiveSegmentResponse(
            working_mask_url=_build_output_url(task_dir, "working_mask.png", task_store.base_dir),
            preview_rgba=_build_output_url(task_dir, "preview_rgba.png", task_store.base_dir),
            can_undo=TaskStore.can_undo(metadata),
            can_redo=TaskStore.can_redo(metadata),
        )


@router.post("/{task_id}/undo", response_model=TaskResponse)
def undo_task_edit(task_id: str, request: Request) -> TaskResponse:
    with _task_state_lock(task_id):
        task_store = TaskStore(request.app.state.settings.outputs_dir)
        _resolve_task_dir(task_store.base_dir, task_id)
        _read_task_metadata_or_http(task_store, task_id)
        with _task_visible_state_transaction(task_store, task_id):
            try:
                metadata = task_store.restore_history_snapshot(task_id, direction=-1)
            except IndexError as exc:
                raise HTTPException(status_code=409, detail="No earlier history state") from exc
            except FileNotFoundError as exc:
                raise HTTPException(status_code=409, detail="History snapshot unavailable") from exc

            task = task_store.build_task_record(task_id)
            _write_preview_rgba_with_task_state_guards(
                Path(task.source_rgb_path),
                Path(task.working_mask_path),
                Path(task.preview_rgba_path),
            )
            return _task_response_from_metadata(task_id, task_store.base_dir, metadata)


@router.post("/{task_id}/redo", response_model=TaskResponse)
def redo_task_edit(task_id: str, request: Request) -> TaskResponse:
    with _task_state_lock(task_id):
        task_store = TaskStore(request.app.state.settings.outputs_dir)
        _resolve_task_dir(task_store.base_dir, task_id)
        _read_task_metadata_or_http(task_store, task_id)
        with _task_visible_state_transaction(task_store, task_id):
            try:
                metadata = task_store.restore_history_snapshot(task_id, direction=1)
            except IndexError as exc:
                raise HTTPException(status_code=409, detail="No later history state") from exc
            except FileNotFoundError as exc:
                raise HTTPException(status_code=409, detail="History snapshot unavailable") from exc

            task = task_store.build_task_record(task_id)
            _write_preview_rgba_with_task_state_guards(
                Path(task.source_rgb_path),
                Path(task.working_mask_path),
                Path(task.preview_rgba_path),
            )
            return _task_response_from_metadata(task_id, task_store.base_dir, metadata)


@router.post("/{task_id}/save", response_model=SaveTaskResponse)
def save_task_snapshot(task_id: str, request: Request) -> SaveTaskResponse:
    with _task_state_lock(task_id):
        task_store = TaskStore(request.app.state.settings.outputs_dir)
        task_dir = _resolve_task_dir(task_store.base_dir, task_id)
        _read_task_metadata_or_http(task_store, task_id)
        if not (task_dir / "source_rgb.png").exists():
            raise HTTPException(status_code=404, detail="source_rgb.png not found")

        saved_record = task_store.clone_task_as_saved_version(task_id)
        with _task_visible_state_transaction(
            task_store,
            task_id,
            restore_history_dir=True,
            cleanup_paths=(Path(saved_record.task_dir),),
        ):
            saved_metadata = task_store.read_metadata(saved_record.task_id)

            reset_metadata = task_store.reset_task_to_initial_state(task_id)
            current_task = task_store.build_task_record(task_id)
            _write_preview_rgba(
                Path(current_task.source_rgb_path),
                Path(current_task.working_mask_path),
                Path(current_task.preview_rgba_path),
            )
            saved_metadata = task_store.update_metadata(saved_record.task_id)

            return SaveTaskResponse(
                saved_task=_task_response_from_metadata(
                    saved_record.task_id,
                    task_store.base_dir,
                    saved_metadata,
                ),
                current_task=_task_response_from_metadata(
                    task_id,
                    task_store.base_dir,
                    reset_metadata,
                ),
            )
