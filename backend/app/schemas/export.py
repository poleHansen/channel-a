from typing import Literal

from pydantic import BaseModel, Field


class CropBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float


class ExportRequest(BaseModel):
    task_id: str
    format: Literal["rgb", "rgba"]
    background_hex: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    crop_box: CropBox | None = None
    aspect_ratio: Literal["free", "1:1", "3:4", "4:5", "16:9"] = "free"
    padding_percent: float = Field(default=12, ge=0, le=100)
    size_mode: Literal["original-size", "crop-size"] = "crop-size"


class ExportResponse(BaseModel):
    output_path: str
