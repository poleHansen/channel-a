import { render, screen } from "@testing-library/react";
import { act } from "react";

import { EditorCanvas } from "../components/canvas/EditorCanvas";
import { useTaskStore } from "../state/taskStore";

test("renders the empty canvas placeholder", () => {
  render(<EditorCanvas />);

  expect(screen.getByText("Drop an image to begin")).toBeInTheDocument();
});

test("renders preview image when a preview path exists", () => {
  act(() => {
    useTaskStore.getState().setAutoSegmentResult({
      taskId: "task-123",
      previewRgbaPath: "/outputs/task-123/preview_rgba.png",
    });
  });

  render(<EditorCanvas />);

  expect(screen.getByRole("img", { name: "Cutout preview" })).toHaveAttribute(
    "src",
    "/outputs/task-123/preview_rgba.png",
  );
});
