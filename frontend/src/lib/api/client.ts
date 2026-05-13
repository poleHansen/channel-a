import type { AutoSegmentResponse } from "./types";

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
