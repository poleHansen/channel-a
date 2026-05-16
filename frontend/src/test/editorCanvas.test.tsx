import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { EditorCanvas } from "../components/canvas/EditorCanvas";
import { useEditorStore } from "../state/editorStore";
import { useTaskStore } from "../state/taskStore";

beforeEach(() => {
  useTaskStore.setState({
    currentTaskId: null,
    previewRgbaPath: null,
    taskHistory: [],
  });
  useEditorStore.setState({
    activeTool: "keep-point",
    promptPoints: [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("renders the empty canvas placeholder", () => {
  render(<EditorCanvas />);

  expect(screen.getByText("Drop an image to begin")).toBeInTheDocument();
});

test("renders preview image when a preview path exists", () => {
  act(() => {
    useTaskStore.getState().setCurrentTask({
      createdAt: "2026-05-16T01:00:00+00:00",
      mode: "auto",
      previewRgbaPath: "/outputs/task-123/preview_rgba.png",
      status: "ready",
      taskId: "task-123",
      updatedAt: "2026-05-16T01:00:00+00:00",
    });
  });

  render(<EditorCanvas />);

  expect(screen.getByRole("img", { name: "Cutout preview" })).toHaveAttribute(
    "src",
    expect.stringMatching(/^\/outputs\/task-123\/preview_rgba\.png\?v=\d+$/),
  );
});

test("clicking the canvas sends a keep-point refine request and refreshes the preview", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        working_mask_path: "/outputs/task-123/working_mask.png",
        preview_rgba: "/outputs/task-123/preview_rgba.png",
      }),
    }),
  );

  act(() => {
    useTaskStore.getState().setCurrentTask({
      createdAt: "2026-05-16T01:00:00+00:00",
      mode: "auto",
      previewRgbaPath: "/outputs/task-123/preview_rgba.png",
      status: "ready",
      taskId: "task-123",
      updatedAt: "2026-05-16T01:00:00+00:00",
    });
  });

  render(<EditorCanvas />);

  const canvas = screen.getByRole("region", { name: "Editor canvas" });
  const preview = screen.getByRole("img", { name: "Cutout preview" });

  Object.defineProperty(preview, "naturalWidth", {
    configurable: true,
    get: () => 100,
  });
  Object.defineProperty(preview, "naturalHeight", {
    configurable: true,
    get: () => 50,
  });
  Object.defineProperty(canvas, "clientWidth", {
    configurable: true,
    get: () => 200,
  });
  Object.defineProperty(canvas, "clientHeight", {
    configurable: true,
    get: () => 100,
  });
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  fireEvent.load(preview);
  fireEvent.click(canvas, { clientX: 100, clientY: 50 });

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      "/api/segment/interactive",
      expect.objectContaining({
        body: JSON.stringify({
          task_id: "task-123",
          points: [{ x: 50, y: 25, type: "positive" }],
          boxes: [],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });

  await waitFor(() => {
    expect(screen.getByRole("img", { name: "Cutout preview" })).toHaveAttribute(
      "src",
      expect.stringMatching(
        /^\/outputs\/task-123\/preview_rgba\.png\?v=\d+$/,
      ),
    );
  });
});
