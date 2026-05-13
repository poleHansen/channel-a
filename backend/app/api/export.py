from fastapi import APIRouter, HTTPException, Request

from app.schemas.export import ExportRequest, ExportResponse
from app.services.export_service import export_rgb_white, export_rgba

router = APIRouter(prefix="/export")


def _resolve_task_dir(outputs_dir, task_id: str):
    base_dir = outputs_dir.resolve()
    task_dir = (base_dir / task_id).resolve()

    try:
        task_dir.relative_to(base_dir)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid task_id") from exc

    return task_dir


@router.post("", response_model=ExportResponse)
def export_task(payload: ExportRequest, request: Request) -> ExportResponse:
    task_dir = _resolve_task_dir(request.app.state.settings.outputs_dir, payload.task_id)
    source_path = task_dir / "source_rgb.png"
    mask_path = task_dir / "working_mask.png"

    if payload.format == "rgba":
        output_path = task_dir / "result_rgba.png"
        export_rgba(source_path, mask_path, output_path)
    else:
        output_path = task_dir / "result_rgb.jpg"
        export_rgb_white(
            source_path,
            mask_path,
            output_path,
            payload.background_hex,
        )

    return ExportResponse(output_path=str(output_path))
