import { afterEach, expect, test, vi } from "vitest";

import {
  autoSegmentExistingTask,
  buildAutoSegmentRequest,
  createTaskFromUpload,
  exportSegmentResult,
  getTask,
  listTasks,
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

test("createTaskFromUpload supports manual mode uploads", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task_id: "task-manual",
        preview_rgba: "/outputs/task-manual/preview_rgba.png",
        created_at: "2026-05-16T00:00:00+00:00",
        updated_at: "2026-05-16T00:00:00+00:00",
        mode: "manual",
        status: "ready",
      }),
    }),
  );

  await expect(
    createTaskFromUpload(new File(["demo"], "demo.png", { type: "image/png" }), "manual"),
  ).resolves.toMatchObject({
    taskId: "task-manual",
    mode: "manual",
    previewRgbaPath: "/outputs/task-manual/preview_rgba.png",
  });
});

test("listTasks returns recent task history", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: [
          {
            task_id: "task-2",
            created_at: "2026-05-16T01:00:00+00:00",
            updated_at: "2026-05-16T01:00:00+00:00",
            mode: "auto",
            status: "ready",
            preview_rgba: "/outputs/task-2/preview_rgba.png",
          },
        ],
      }),
    }),
  );

  await expect(listTasks()).resolves.toEqual([
    {
      createdAt: "2026-05-16T01:00:00+00:00",
      mode: "auto",
      previewRgbaPath: "/outputs/task-2/preview_rgba.png",
      status: "ready",
      taskId: "task-2",
      updatedAt: "2026-05-16T01:00:00+00:00",
    },
  ]);
});

test("getTask maps task details from the backend", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task_id: "task-9",
        created_at: "2026-05-16T02:00:00+00:00",
        updated_at: "2026-05-16T03:00:00+00:00",
        mode: "manual",
        status: "ready",
        preview_rgba: "/outputs/task-9/preview_rgba.png",
      }),
    }),
  );

  await expect(getTask("task-9")).resolves.toEqual({
    createdAt: "2026-05-16T02:00:00+00:00",
    mode: "manual",
    previewRgbaPath: "/outputs/task-9/preview_rgba.png",
    status: "ready",
    taskId: "task-9",
    updatedAt: "2026-05-16T03:00:00+00:00",
  });
});

test("autoSegmentExistingTask returns refreshed task details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task_id: "task-10",
        created_at: "2026-05-16T02:00:00+00:00",
        updated_at: "2026-05-16T04:00:00+00:00",
        mode: "auto",
        status: "ready",
        preview_rgba: "/outputs/task-10/preview_rgba.png",
      }),
    }),
  );

  await expect(autoSegmentExistingTask("task-10")).resolves.toEqual({
    createdAt: "2026-05-16T02:00:00+00:00",
    mode: "auto",
    previewRgbaPath: "/outputs/task-10/preview_rgba.png",
    status: "ready",
    taskId: "task-10",
    updatedAt: "2026-05-16T04:00:00+00:00",
  });
});
