export type ToolMode =
  | "keep-point"
  | "remove-point"
  | "box"
  | "brush-add"
  | "brush-remove";

export interface PromptPoint {
  x: number;
  y: number;
  type: "positive" | "negative";
}

export interface PromptBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BrushPoint {
  x: number;
  y: number;
}

export interface BrushStroke {
  tool: "brush-add" | "brush-remove";
  size: number;
  softness: number;
  points: BrushPoint[];
}
