from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.export import CropBox


TaskMode = Literal["auto", "manual"]
TaskStatus = Literal["created", "ready"]


class ExportSettings(BaseModel):
    crop_box: CropBox | None = None
    aspect_ratio: Literal["free", "1:1", "3:4", "4:5", "16:9"] = "free"
    padding_percent: float = Field(default=12, ge=0, le=100)
    size_mode: Literal["original-size", "crop-size"] = "crop-size"


class TaskRecord(BaseModel):
    task_id: str
    task_dir: str
    original_path: str
    source_rgb_path: str
    auto_mask_path: str
    working_mask_path: str
    preview_rgba_path: str
    project_json_path: str


class TaskMetadata(BaseModel):
    task_id: str
    created_at: str
    updated_at: str
    mode: TaskMode
    status: TaskStatus
    original_image_size: dict[str, int] | None
    current_mask_path: str
    background_settings: dict[str, object]
    export_settings: ExportSettings = Field(default_factory=ExportSettings)
    edit_history: list[dict[str, object]]
    history_cursor: int = -1
    edge_refinement_enabled: bool


class TaskSummary(BaseModel):
    task_id: str
    created_at: str
    updated_at: str
    mode: TaskMode
    status: TaskStatus
    export_settings: ExportSettings = Field(default_factory=ExportSettings)
    preview_rgba: str
    can_undo: bool = False
    can_redo: bool = False


class TaskListResponse(BaseModel):
    tasks: list[TaskSummary]


class TaskResponse(BaseModel):
    task_id: str
    created_at: str
    updated_at: str
    mode: TaskMode
    status: TaskStatus
    export_settings: ExportSettings = Field(default_factory=ExportSettings)
    preview_rgba: str
    can_undo: bool = False
    can_redo: bool = False


class SaveTaskResponse(BaseModel):
    saved_task: TaskResponse
    current_task: TaskResponse
