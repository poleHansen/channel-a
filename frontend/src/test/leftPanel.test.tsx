import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { LeftPanel } from "../components/layout/LeftPanel";
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

test("renders persistent task history and restores a selected task", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tasks: [
            {
              task_id: "task-old",
              created_at: "2026-05-16T01:00:00+00:00",
              updated_at: "2026-05-16T02:00:00+00:00",
              mode: "manual",
              status: "ready",
              preview_rgba: "/outputs/task-old/preview_rgba.png",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          task_id: "task-old",
          created_at: "2026-05-16T01:00:00+00:00",
          updated_at: "2026-05-16T02:00:00+00:00",
          mode: "manual",
          status: "ready",
          preview_rgba: "/outputs/task-old/preview_rgba.png",
        }),
      }),
  );

  render(<LeftPanel />);

  expect(await screen.findByRole("button", { name: /task-old/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /task-old/i }));

  await waitFor(() => {
    expect(useTaskStore.getState().currentTaskId).toBe("task-old");
    expect(useTaskStore.getState().previewRgbaPath).toMatch(
      /^\/outputs\/task-old\/preview_rgba\.png\?v=\d+$/,
    );
  });
});
