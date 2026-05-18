from typing import Literal

from pydantic import BaseModel, Field, model_validator

MAX_BRUSH_POINTS = 2048
MAX_BRUSH_SIZE = 2048.0
MAX_BRUSH_COORDINATE = 100_000.0
MAX_INTERACTIVE_POINTS = 256
MAX_INTERACTIVE_BOXES = 64


class AutoSegmentResponse(BaseModel):
    task_id: str
    auto_mask: str
    preview_rgba: str


class PromptPoint(BaseModel):
    x: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)
    y: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)
    type: Literal["positive", "negative"]


class PromptBox(BaseModel):
    x0: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)
    y0: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)
    x1: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)
    y1: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_bounds(self) -> "PromptBox":
        if self.x0 > self.x1:
            raise ValueError("x1 must be greater than or equal to x0")
        if self.y0 > self.y1:
            raise ValueError("y1 must be greater than or equal to y0")
        return self


class InteractiveSegmentRequest(BaseModel):
    task_id: str
    points: list[PromptPoint] = Field(max_length=MAX_INTERACTIVE_POINTS)
    boxes: list[PromptBox] = Field(max_length=MAX_INTERACTIVE_BOXES)

    @model_validator(mode="after")
    def validate_non_empty_prompt(self) -> "InteractiveSegmentRequest":
        if not self.points and not self.boxes:
            raise ValueError("At least one point or box is required")
        return self


class InteractiveSegmentResponse(BaseModel):
    working_mask_url: str
    preview_rgba: str
    can_undo: bool = False
    can_redo: bool = False


class BrushPoint(BaseModel):
    x: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)
    y: float = Field(ge=-MAX_BRUSH_COORDINATE, le=MAX_BRUSH_COORDINATE, allow_inf_nan=False)


class BrushStroke(BaseModel):
    points: list[BrushPoint] = Field(min_length=1, max_length=MAX_BRUSH_POINTS)
    size: float = Field(gt=0, le=MAX_BRUSH_SIZE, allow_inf_nan=False)
    softness: float = Field(ge=0, le=1, allow_inf_nan=False)
    tool: Literal["brush-add", "brush-remove"]


class BrushApplyRequest(BaseModel):
    stroke: BrushStroke
