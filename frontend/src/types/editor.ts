export type ToolMode =
  | "keep-point"
  | "remove-point"
  | "box"
  | "export-box"
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

export type ExportAspectRatio = "free" | "1:1" | "3:4" | "4:5" | "16:9";

export type ExportSizeMode = "original-size" | "crop-size";

export interface ExportBox {
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
