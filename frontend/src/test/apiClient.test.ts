import { afterEach, expect, test, vi } from "vitest";

import {
  buildAutoSegmentRequest,
  exportSegmentResult,
  refineInteractiveSegment,
  uploadAutoSegment,
} from "../lib/api/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("buildAutoSegmentRequest appends file payload", () => {
  const file = new File(["demo"], "demo.png", { type: "image/png" });
  const request = buildAutoSegmentRequest(file);

  expect(request.method).toBe("POST");
  expect(request.url).toBe("/api/segment/auto");
  expect(request.body.get("file")).toBe(file);
});

test("uploadAutoSegment maps preview_rgba_path responses into frontend state fields", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task_id: "task-123",
        auto_mask_path: "auto-mask.png",
        preview_rgba_path: "preview-rgba.png",
      }),
    }),
  );

  await expect(
    uploadAutoSegment(new File(["demo"], "demo.png", { type: "image/png" })),
  ).resolves.toEqual({
    taskId: "task-123",
    autoMaskPath: "auto-mask.png",
    previewRgbaPath: "preview-rgba.png",
  });
});

test("uploadAutoSegment also accepts legacy preview_rgba responses from the current backend", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task_id: "task-456",
        auto_mask: "auto-mask.png",
        preview_rgba: "preview-rgba.png",
      }),
    }),
  );

  await expect(
    uploadAutoSegment(new File(["demo"], "demo.png", { type: "image/png" })),
  ).resolves.toEqual({
    taskId: "task-456",
    autoMaskPath: "auto-mask.png",
    previewRgbaPath: "preview-rgba.png",
  });
});

test("uploadAutoSegment rejects responses without a task id", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        preview_rgba: "preview-rgba.png",
      }),
    }),
  );

  await expect(
    uploadAutoSegment(new File(["demo"], "demo.png", { type: "image/png" })),
  ).rejects.toThrow("Auto segmentation response did not include a task id.");
});

test("refineInteractiveSegment maps preview and mask paths from the backend", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        working_mask_path: "working-mask.png",
        preview_rgba: "preview-rgba.png",
      }),
    }),
  );

  await expect(
    refineInteractiveSegment({
      taskId: "task-123",
      points: [{ x: 12, y: 18, type: "positive" }],
      boxes: [],
    }),
  ).resolves.toEqual({
    workingMaskPath: "working-mask.png",
    previewRgbaPath: "preview-rgba.png",
  });
});

test("exportSegmentResult returns the browser-downloadable output path", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_path: "/outputs/task-123/result_rgba.png",
      }),
    }),
  );

  await expect(
    exportSegmentResult({
      taskId: "task-123",
      format: "rgba",
    }),
  ).resolves.toBe("/outputs/task-123/result_rgba.png");
});
