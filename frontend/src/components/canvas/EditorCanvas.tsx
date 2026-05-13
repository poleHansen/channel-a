import { CanvasMaskLayer } from "./CanvasMaskLayer";
import { CanvasPreviewLayer } from "./CanvasPreviewLayer";
import { CanvasPromptLayer } from "./CanvasPromptLayer";
import { useTaskStore } from "../../state/taskStore";

export function EditorCanvas() {
  const previewRgbaPath = useTaskStore((state) => state.previewRgbaPath);

  return (
    <div
      aria-label="Editor canvas"
      className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-[var(--border)] bg-[rgba(255,255,255,0.35)] md:min-h-[620px]"
      role="region"
    >
      <CanvasPreviewLayer />
      <CanvasPromptLayer />
      <CanvasMaskLayer />
      {!previewRgbaPath ? (
        <p className="relative z-10 text-sm text-[var(--muted)]">Drop an image to begin</p>
      ) : null}
    </div>
  );
}
