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
}

export interface ExportResponse {
  output_path: string;
}
