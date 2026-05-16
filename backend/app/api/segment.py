from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from PIL import Image

from app.schemas.segment import (
    AutoSegmentResponse,
    InteractiveSegmentRequest,
    InteractiveSegmentResponse,
)
from app.services.image_service import normalize_upload_to_rgb
from app.services.task_store import TaskStore

router = APIRouter(prefix="/segment")


def _resolve_task_dir(outputs_dir: Path, task_id: str) -> Path:
    base_dir = outputs_dir.resolve()
    task_dir = (base_dir / task_id).resolve()

    try:
        task_dir.relative_to(base_dir)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid task_id") from exc

    return task_dir


def _build_output_url(task_dir: Path, file_name: str, outputs_dir: Path) -> str:
    relative_path = (task_dir / file_name).resolve().relative_to(outputs_dir.resolve())
    return f"/outputs/{relative_path.as_posix()}"


def _write_preview_rgba(source_rgb_path: Path, mask_path: Path, preview_rgba_path: Path) -> None:
    with Image.open(source_rgb_path) as source_image:
        preview = source_image.convert("RGBA")
    with Image.open(mask_path) as mask_image:
        mask = mask_image.convert("L")
        if mask.size != preview.size:
            raise HTTPException(
                status_code=500,
                detail="Generated mask size does not match normalized source image size",
            )
        preview.putalpha(mask)
    preview.save(preview_rgba_path, format="PNG")


@router.post("/auto", response_model=AutoSegmentResponse)
async def auto_segment(
    request: Request,
    file: UploadFile = File(...),
) -> AutoSegmentResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    task = task_store.create_task()
    original_path = Path(task.original_path)
    original_path.write_bytes(await file.read())
    normalize_upload_to_rgb(original_path, Path(task.source_rgb_path))
    with Image.open(task.source_rgb_path) as source_image:
        width, height = source_image.size
        Image.new("L", source_image.size, color=255).save(task.working_mask_path, format="PNG")
    task_store.push_history_snapshot(task.task_id)
    request.app.state.models.auto_segmenter.segment(
        Path(task.source_rgb_path),
        Path(task.auto_mask_path),
    )
    Path(task.working_mask_path).write_bytes(Path(task.auto_mask_path).read_bytes())
    task_store.push_history_snapshot(task.task_id)

    _write_preview_rgba(
        Path(task.source_rgb_path),
        Path(task.auto_mask_path),
        Path(task.preview_rgba_path),
    )
    task_store.update_metadata(
        task.task_id,
        mode="auto",
        status="ready",
        original_image_size={"width": width, "height": height},
        current_mask_path=task.working_mask_path,
    )

    return AutoSegmentResponse(
        task_id=task.task_id,
        auto_mask=_build_output_url(task_dir=Path(task.task_dir), file_name="auto_mask.png", outputs_dir=request.app.state.settings.outputs_dir),
        preview_rgba=_build_output_url(task_dir=Path(task.task_dir), file_name="preview_rgba.png", outputs_dir=request.app.state.settings.outputs_dir),
    )


@router.post("/interactive", response_model=InteractiveSegmentResponse)
def interactive_segment(
    payload: InteractiveSegmentRequest,
    request: Request,
) -> InteractiveSegmentResponse:
    task_dir = _resolve_task_dir(request.app.state.settings.outputs_dir, payload.task_id)
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    working_mask_input_path = task_dir / "working_mask.png"
    if not working_mask_input_path.exists():
        raise HTTPException(status_code=404, detail="working_mask.png not found")

    try:
        working_mask_path = request.app.state.models.interactive_segmenter.refine(
            task_dir / "source_rgb.png",
            working_mask_input_path,
            payload.points,
            payload.boxes,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    preview_rgba_path = task_dir / "preview_rgba.png"
    _write_preview_rgba(task_dir / "source_rgb.png", working_mask_path, preview_rgba_path)
    metadata = task_store.push_history_snapshot(payload.task_id)

    return InteractiveSegmentResponse(
        working_mask_path=str(working_mask_path),
        preview_rgba=_build_output_url(
            task_dir=task_dir,
            file_name="preview_rgba.png",
            outputs_dir=request.app.state.settings.outputs_dir,
        ),
        can_undo=TaskStore.can_undo(metadata),
        can_redo=TaskStore.can_redo(metadata),
    )
