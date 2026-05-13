import { afterEach, expect, test, vi } from "vitest";

import { buildAutoSegmentRequest, uploadAutoSegment } from "../lib/api/client";

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
