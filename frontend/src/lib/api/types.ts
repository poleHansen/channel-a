export interface AutoSegmentResponse {
  task_id: string;
  auto_mask_path?: string;
  preview_rgba_path?: string;
  auto_mask?: string;
  preview_rgba?: string;
}

export interface InteractiveSegmentResponse {
  working_mask_path: string;
  preview_rgba_path?: string;
  preview_rgba?: string;
  can_undo?: boolean;
  can_redo?: boolean;
}

export interface ExportResponse {
  output_path: string;
}

export interface TaskResponse {
  task_id: string;
  created_at: string;
  updated_at: string;
  mode: "auto" | "manual";
  status: "created" | "ready";
  preview_rgba_path?: string;
  preview_rgba?: string;
  can_undo?: boolean;
  can_redo?: boolean;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
}

export interface SaveTaskResponse {
  saved_task: TaskResponse;
  current_task: TaskResponse;
}
