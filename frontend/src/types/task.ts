export type TaskMode = "auto" | "manual";
export type TaskStatus = "created" | "ready";

export interface AutoSegmentResult {
  taskId: string;
  autoMaskPath?: string;
  createdAt: string;
  mode: TaskMode;
  previewRgbaPath: string;
  status: TaskStatus;
  updatedAt: string;
}

export interface TaskSummary {
  createdAt: string;
  mode: TaskMode;
  previewRgbaPath: string;
  status: TaskStatus;
  taskId: string;
  updatedAt: string;
}
