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
