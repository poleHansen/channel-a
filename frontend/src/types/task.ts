export type TaskMode = "auto" | "manual";
export type TaskStatus = "created" | "ready";

export interface AutoSegmentResult {
  taskId: string;
  autoMaskPath?: string;
  canRedo: boolean;
  canUndo: boolean;
  createdAt: string;
  mode: TaskMode;
  previewRgbaPath: string;
  status: TaskStatus;
  updatedAt: string;
}

export interface TaskSummary {
  canRedo: boolean;
  canUndo: boolean;
  createdAt: string;
  mode: TaskMode;
  previewRgbaPath: string;
  status: TaskStatus;
  taskId: string;
  updatedAt: string;
}
