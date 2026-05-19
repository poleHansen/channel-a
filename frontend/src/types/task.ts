import type { ExportAspectRatio, ExportBox, ExportSizeMode } from "./editor";

export type TaskMode = "auto" | "manual";
export type TaskStatus = "created" | "ready";

export interface ExportSettings {
  cropBox: ExportBox | null;
  aspectRatio: ExportAspectRatio;
  paddingPercent: number;
  sizeMode: ExportSizeMode;
}

export interface AutoSegmentResult {
  taskId: string;
  autoMaskPath?: string;
  canRedo: boolean;
  canUndo: boolean;
  createdAt: string;
  exportSettings?: ExportSettings;
  mode: TaskMode;
  previewRgbaPath: string;
  status: TaskStatus;
  updatedAt: string;
}

export interface TaskSummary {
  canRedo: boolean;
  canUndo: boolean;
  createdAt: string;
  exportSettings?: ExportSettings;
  mode: TaskMode;
  previewRgbaPath: string;
  status: TaskStatus;
  taskId: string;
  updatedAt: string;
}
