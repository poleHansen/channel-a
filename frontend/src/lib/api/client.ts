import type { BrushStroke, PromptBox, PromptPoint } from "../../types/editor";
import type { AutoSegmentResult, TaskSummary } from "../../types/task";
import type {
  AutoSegmentResponse,
  ExportResponse,
  InteractiveSegmentResponse,
  SaveTaskResponse,
  TaskListResponse,
  TaskResponse,
} from "./types";

async function buildApiError(
  response: Response,
  fallbackMessage: string,
): Promise<Error> {
  let rawBody = "";

  try {
    rawBody = (await response.text()).trim();
  } catch {
    // Ignore body parsing problems and fall back to the default message.
  }

  if (rawBody) {
    try {
      const payload = JSON.parse(rawBody) as { detail?: string };
      if (payload.detail) {
        return new Error(payload.detail);
      }
    } catch {
      // Ignore JSON parsing problems and fall back to the raw response body.
    }

    return new Error(rawBody);
  }

  return new Error(fallbackMessage);
}

function mapTaskResponse(payload: TaskResponse): AutoSegmentResult {
  const previewRgbaPath = payload.preview_rgba_path ?? payload.preview_rgba;

  if (!payload.task_id) {
    throw new Error("Task response did not include a task id.");
  }

  if (!previewRgbaPath) {
    throw new Error("Task response did not include a preview path.");
  }

  return {
    createdAt: payload.created_at,
    canRedo: payload.can_redo ?? false,
    canUndo: payload.can_undo ?? false,
    mode: payload.mode,
    previewRgbaPath,
    status: payload.status,
    taskId: payload.task_id,
    updatedAt: payload.updated_at,
  };
}

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

export async function createTaskFromUpload(
  file: File,
  mode: "auto" | "manual",
): Promise<AutoSegmentResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("mode", mode);

  const response = await fetch("/api/tasks", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw await buildApiError(response, "Task creation request failed.");
  }

  return mapTaskResponse((await response.json()) as TaskResponse);
}

export async function listTasks(): Promise<TaskSummary[]> {
  const response = await fetch("/api/tasks");

  if (!response.ok) {
    throw await buildApiError(response, "Task history request failed.");
  }

  const payload = (await response.json()) as TaskListResponse;
  return payload.tasks.map((task) => mapTaskResponse(task));
}

export async function getTask(taskId: string): Promise<AutoSegmentResult> {
  const response = await fetch(`/api/tasks/${taskId}`);

  if (!response.ok) {
    throw await buildApiError(response, "Task load request failed.");
  }

  return mapTaskResponse((await response.json()) as TaskResponse);
}

export async function autoSegmentExistingTask(
  taskId: string,
): Promise<AutoSegmentResult> {
  const response = await fetch(`/api/tasks/${taskId}/auto-segment`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await buildApiError(response, "Automatic cutout request failed.");
  }

  return mapTaskResponse((await response.json()) as TaskResponse);
}

export async function undoTaskEdit(taskId: string): Promise<AutoSegmentResult> {
  const response = await fetch(`/api/tasks/${taskId}/undo`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await buildApiError(response, "Undo request failed.");
  }

  return mapTaskResponse((await response.json()) as TaskResponse);
}

export async function redoTaskEdit(taskId: string): Promise<AutoSegmentResult> {
  const response = await fetch(`/api/tasks/${taskId}/redo`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await buildApiError(response, "Redo request failed.");
  }

  return mapTaskResponse((await response.json()) as TaskResponse);
}

export async function saveTaskSnapshot(taskId: string): Promise<{
  savedTask: AutoSegmentResult;
  currentTask: AutoSegmentResult;
}> {
  const response = await fetch(`/api/tasks/${taskId}/save`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await buildApiError(response, "Save request failed.");
  }

  const result = (await response.json()) as SaveTaskResponse;

  return {
    savedTask: mapTaskResponse(result.saved_task),
    currentTask: mapTaskResponse(result.current_task),
  };
}

export async function refineInteractiveSegment(payload: {
  taskId: string;
  points: PromptPoint[];
  boxes: PromptBox[];
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
    throw await buildApiError(response, "Interactive refinement request failed.");
  }

  const result = (await response.json()) as InteractiveSegmentResponse;
  const previewRgbaPath = result.preview_rgba_path ?? result.preview_rgba;

  if (!previewRgbaPath) {
    throw new Error("Interactive refinement response did not include a preview path.");
  }

  return {
    canRedo: result.can_redo ?? false,
    canUndo: result.can_undo ?? false,
    workingMaskUrl: result.working_mask_url,
    previewRgbaPath,
  };
}

export async function applyBrushStroke(taskId: string, stroke: BrushStroke) {
  const response = await fetch(`/api/tasks/${taskId}/brush`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stroke }),
  });

  if (!response.ok) {
    throw await buildApiError(response, "Brush request failed.");
  }

  const result = (await response.json()) as InteractiveSegmentResponse;
  const previewRgbaPath = result.preview_rgba_path ?? result.preview_rgba;

  if (!previewRgbaPath) {
    throw new Error("Brush response did not include a preview path.");
  }

  return {
    canRedo: result.can_redo ?? false,
    canUndo: result.can_undo ?? false,
    workingMaskUrl: result.working_mask_url,
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
    throw await buildApiError(response, "Export request failed.");
  }

  const result = (await response.json()) as ExportResponse;

  if (!result.output_path) {
    throw new Error("Export response did not include an output path.");
  }

  return result.output_path;
}
