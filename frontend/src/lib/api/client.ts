import type { PromptPoint } from "../../types/editor";
import type {
  AutoSegmentResponse,
  ExportResponse,
  InteractiveSegmentResponse,
} from "./types";

export function buildAutoSegmentRequest(file: File) {
  const body = new FormData();
  body.append("file", file);

  return {
    url: "/api/segment/auto",
    method: "POST" as const,
    body,
  };
}

export async function uploadAutoSegment(file: File) {
  const request = buildAutoSegmentRequest(file);
  const response = await fetch(request.url, {
    method: request.method,
    body: request.body,
  });

  if (!response.ok) {
    throw new Error("Auto segmentation request failed.");
  }

  const payload = (await response.json()) as AutoSegmentResponse;
  const taskId = payload.task_id;
  const autoMaskPath = payload.auto_mask_path ?? payload.auto_mask;
  const previewRgbaPath = payload.preview_rgba_path ?? payload.preview_rgba;

  if (!taskId) {
    throw new Error("Auto segmentation response did not include a task id.");
  }

  if (!previewRgbaPath) {
    throw new Error("Auto segmentation response did not include a preview path.");
  }

  return {
    taskId,
    autoMaskPath,
    previewRgbaPath,
  };
}

export async function refineInteractiveSegment(payload: {
  taskId: string;
  points: PromptPoint[];
  boxes: Array<Record<string, number>>;
}) {
  const response = await fetch("/api/segment/interactive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_id: payload.taskId,
      points: payload.points,
      boxes: payload.boxes,
    }),
  });

  if (!response.ok) {
    throw new Error("Interactive refinement request failed.");
  }

  const result = (await response.json()) as InteractiveSegmentResponse;
  const previewRgbaPath = result.preview_rgba_path ?? result.preview_rgba;

  if (!previewRgbaPath) {
    throw new Error("Interactive refinement response did not include a preview path.");
  }

  return {
    workingMaskPath: result.working_mask_path,
    previewRgbaPath,
  };
}

export async function exportSegmentResult(payload: {
  taskId: string;
  format: "rgb" | "rgba";
  backgroundHex?: string;
}) {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_id: payload.taskId,
      format: payload.format,
      background_hex: payload.backgroundHex ?? "#FFFFFF",
    }),
  });

  if (!response.ok) {
    throw new Error("Export request failed.");
  }

  const result = (await response.json()) as ExportResponse;

  if (!result.output_path) {
    throw new Error("Export response did not include an output path.");
  }

  return result.output_path;
}
