import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ExportPanel } from "../components/panels/ExportPanel";
import { useTaskStore } from "../state/taskStore";

test("renders export format controls", () => {
  useTaskStore.setState({
    currentTaskId: null,
    previewRgbaPath: null,
  });

  render(<ExportPanel />);

  expect(screen.getByRole("button", { name: "RGBA PNG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "RGB JPG" })).toBeDisabled();
});

beforeEach(() => {
  useTaskStore.setState({
    currentTaskId: "task-123",
    previewRgbaPath: "/outputs/task-123/preview_rgba.png",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("clicking RGBA export requests the backend and triggers download", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_path: "/outputs/task-123/result_rgba.png",
      }),
    }),
  );

  const click = vi.fn();
  const remove = vi.fn();
  const anchor = {
    click,
    href: "",
    download: "",
    remove,
  } as unknown as HTMLAnchorElement;
  const originalCreateElement = document.createElement.bind(document);
  const createElementSpy = vi
    .spyOn(document, "createElement")
    .mockImplementation((tagName: string) => {
      if (tagName === "a") {
        return anchor;
      }
      return originalCreateElement(tagName);
    });

  render(<ExportPanel />);

  fireEvent.click(screen.getByRole("button", { name: "RGBA PNG" }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      "/api/export",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: "task-123",
          format: "rgba",
          background_hex: "#FFFFFF",
        }),
      }),
    );
  });

  await waitFor(() => {
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(anchor.href).toBe("/outputs/task-123/result_rgba.png");
    expect(anchor.download).toBe("result_rgba.png");
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});
