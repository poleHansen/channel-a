from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image

from app.api.segment import _build_output_url, _resolve_task_dir, _write_preview_rgba
from app.schemas.tasks import TaskListResponse, TaskMode, TaskResponse, TaskSummary
from app.services.image_service import normalize_upload_to_rgb
from app.services.task_store import TaskStore

router = APIRouter(prefix="/tasks")


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

    request.app.state.models.auto_segmenter.segment(
        Path(task.source_rgb_path),
        Path(task.auto_mask_path),
    )
    Path(task.working_mask_path).write_bytes(Path(task.auto_mask_path).read_bytes())
    _write_preview_rgba(
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
    metadata = task_store.read_metadata(task_id)
    return _task_response_from_metadata(task_id, task_store.base_dir, metadata)


@router.post("/{task_id}/auto-segment", response_model=TaskResponse)
def auto_segment_existing_task(task_id: str, request: Request) -> TaskResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    task_dir = _resolve_task_dir(task_store.base_dir, task_id)
    if not (task_dir / "source_rgb.png").exists():
        raise HTTPException(status_code=404, detail="source_rgb.png not found")
    return _run_auto_segment_for_task(request, task_id)


@router.post("/{task_id}/undo", response_model=TaskResponse)
def undo_task_edit(task_id: str, request: Request) -> TaskResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    _resolve_task_dir(task_store.base_dir, task_id)
    try:
        metadata = task_store.restore_history_snapshot(task_id, direction=-1)
    except IndexError as exc:
        raise HTTPException(status_code=409, detail="No earlier history state") from exc

    task = task_store.build_task_record(task_id)
    _write_preview_rgba(
        Path(task.source_rgb_path),
        Path(task.working_mask_path),
        Path(task.preview_rgba_path),
    )
    return _task_response_from_metadata(task_id, task_store.base_dir, metadata)


@router.post("/{task_id}/redo", response_model=TaskResponse)
def redo_task_edit(task_id: str, request: Request) -> TaskResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    _resolve_task_dir(task_store.base_dir, task_id)
    try:
        metadata = task_store.restore_history_snapshot(task_id, direction=1)
    except IndexError as exc:
        raise HTTPException(status_code=409, detail="No later history state") from exc

    task = task_store.build_task_record(task_id)
    _write_preview_rgba(
        Path(task.source_rgb_path),
        Path(task.working_mask_path),
        Path(task.preview_rgba_path),
    )
    return _task_response_from_metadata(task_id, task_store.base_dir, metadata)
