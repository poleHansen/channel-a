from pydantic import BaseModel


class TaskRecord(BaseModel):
    task_id: str
    task_dir: str
    original_path: str
    source_rgb_path: str
    auto_mask_path: str
    working_mask_path: str
    preview_rgba_path: str
    project_json_path: str
