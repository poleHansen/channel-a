from typing import Literal

from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    task_id: str
    format: Literal["rgb", "rgba"]
    background_hex: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")


class ExportResponse(BaseModel):
    output_path: str
