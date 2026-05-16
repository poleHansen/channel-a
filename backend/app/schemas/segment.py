from typing import Literal

from pydantic import BaseModel


class AutoSegmentResponse(BaseModel):
    task_id: str
    auto_mask: str
    preview_rgba: str


class PromptPoint(BaseModel):
    x: float
    y: float
    type: Literal["positive", "negative"]


class InteractiveSegmentRequest(BaseModel):
    task_id: str
    points: list[PromptPoint]
    boxes: list[dict[str, float]]


class InteractiveSegmentResponse(BaseModel):
    working_mask_path: str
    preview_rgba: str
    can_undo: bool = False
    can_redo: bool = False
