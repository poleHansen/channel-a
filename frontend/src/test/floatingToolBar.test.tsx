import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { FloatingToolBar } from "../components/layout/FloatingToolBar";
import { useEditorStore } from "../state/editorStore";
import { useTaskStore } from "../state/taskStore";

beforeEach(() => {
  useTaskStore.setState({
    currentTaskId: "task-123",
    previewRgbaPath: "/outputs/task-123/preview_rgba.png",
    taskHistory: [],
  });
  useEditorStore.setState({
    activeTool: "keep-point",
    promptPoints: [{ x: 10, y: 10, type: "positive" }],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("auto cutout reruns automatic segmentation for the current task", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        task_id: "task-123",
        created_at: "2026-05-16T01:00:00+00:00",
        updated_at: "2026-05-16T05:00:00+00:00",
        mode: "auto",
        status: "ready",
        preview_rgba: "/outputs/task-123/preview_rgba.png",
      }),
    }),
  );

  render(<FloatingToolBar />);

  fireEvent.click(screen.getByRole("button", { name: "Auto Cutout" }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      "/api/tasks/task-123/auto-segment",
      expect.objectContaining({ method: "POST" }),
    );
    expect(useTaskStore.getState().previewRgbaPath).toMatch(
      /^\/outputs\/task-123\/preview_rgba\.png\?v=\d+$/,
    );
    expect(useEditorStore.getState().promptPoints).toEqual([]);
  });
});
