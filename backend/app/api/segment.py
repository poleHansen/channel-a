import shutil
from os import PathLike
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

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


def _write_preview_rgba_with_file_guards(
    source_rgb_path: Path,
    mask_path: Path,
    preview_rgba_path: Path,
) -> None:
    if not source_rgb_path.exists():
        raise HTTPException(status_code=404, detail=f"{source_rgb_path.name} not found")
    if not mask_path.exists():
        raise HTTPException(status_code=404, detail=f"{mask_path.name} not found")

    try:
        with Image.open(source_rgb_path) as source_image:
            preview = source_image.convert("RGBA")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=409, detail=f"{source_rgb_path.name} is invalid") from exc

    try:
        with Image.open(mask_path) as mask_image:
            mask = mask_image.convert("L")
            if mask.size != preview.size:
                raise HTTPException(
                    status_code=500,
                    detail="Generated mask size does not match normalized source image size",
                )
            preview.putalpha(mask)
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=409, detail=f"{mask_path.name} is invalid") from exc

    preview.save(preview_rgba_path, format="PNG")


def _known_missing_file_name(exc: FileNotFoundError) -> str | None:
    filename = getattr(exc, "filename", None)
    if filename is not None:
        name = Path(filename).name
        if name in {"source_rgb.png", "working_mask.png"}:
            return name

    for value in exc.args:
        if isinstance(value, (str, PathLike)):
            name = Path(value).name
            if name in {"source_rgb.png", "working_mask.png"}:
                return name

    return None


@router.post("/auto", response_model=AutoSegmentResponse)
async def auto_segment(
    request: Request,
    file: UploadFile = File(...),
) -> AutoSegmentResponse:
    task_store = TaskStore(request.app.state.settings.outputs_dir)
    task = task_store.create_task()
    task_dir = Path(task.task_dir)
    try:
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

        _write_preview_rgba_with_file_guards(
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
            auto_mask=_build_output_url(task_dir=task_dir, file_name="auto_mask.png", outputs_dir=request.app.state.settings.outputs_dir),
            preview_rgba=_build_output_url(task_dir=task_dir, file_name="preview_rgba.png", outputs_dir=request.app.state.settings.outputs_dir),
        )
    except Exception:
        shutil.rmtree(task_dir, ignore_errors=True)
        raise


@router.post("/interactive", response_model=InteractiveSegmentResponse)
def interactive_segment(
    payload: InteractiveSegmentRequest,
    request: Request,
) -> InteractiveSegmentResponse:
    from app.api import tasks as tasks_api

    with tasks_api._task_state_lock(payload.task_id):
        task_dir = _resolve_task_dir(request.app.state.settings.outputs_dir, payload.task_id)
        task_store = TaskStore(request.app.state.settings.outputs_dir)
        working_mask_input_path = task_dir / "working_mask.png"
        if not working_mask_input_path.exists():
            raise HTTPException(status_code=404, detail="working_mask.png not found")

        metadata = tasks_api._read_task_metadata_or_http(task_store, payload.task_id)
        original_mask_bytes = working_mask_input_path.read_bytes()

        with tasks_api._brush_transaction(task_store, payload.task_id, metadata):
            try:
                working_mask_path = request.app.state.models.interactive_segmenter.refine(
                    task_dir / "source_rgb.png",
                    working_mask_input_path,
                    payload.points,
                    [box.model_dump() for box in payload.boxes],
                )
            except FileNotFoundError as exc:
                missing_name = _known_missing_file_name(exc)
                if missing_name is not None:
                    raise HTTPException(status_code=404, detail=f"{missing_name} not found") from exc
                raise HTTPException(status_code=500, detail=str(exc)) from exc
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Interactive refinement failed: {exc}") from exc

            if working_mask_input_path.read_bytes() == original_mask_bytes:
                return InteractiveSegmentResponse(
                    working_mask_url=_build_output_url(
                        task_dir=task_dir,
                        file_name="working_mask.png",
                        outputs_dir=request.app.state.settings.outputs_dir,
                    ),
                    preview_rgba=_build_output_url(
                        task_dir=task_dir,
                        file_name="preview_rgba.png",
                        outputs_dir=request.app.state.settings.outputs_dir,
                    ),
                    can_undo=TaskStore.can_undo(metadata),
                    can_redo=TaskStore.can_redo(metadata),
                )

            preview_rgba_path = task_dir / "preview_rgba.png"
            _write_preview_rgba_with_file_guards(
                task_dir / "source_rgb.png",
                working_mask_path,
                preview_rgba_path,
            )
            metadata = task_store.push_history_snapshot(payload.task_id)

        return InteractiveSegmentResponse(
            working_mask_url=_build_output_url(
                task_dir=task_dir,
                file_name="working_mask.png",
                outputs_dir=request.app.state.settings.outputs_dir,
            ),
            preview_rgba=_build_output_url(
                task_dir=task_dir,
                file_name="preview_rgba.png",
                outputs_dir=request.app.state.settings.outputs_dir,
            ),
            can_undo=TaskStore.can_undo(metadata),
            can_redo=TaskStore.can_redo(metadata),
        )
