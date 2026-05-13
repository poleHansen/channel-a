import { useTaskStore } from "../../state/taskStore";

export function CanvasPreviewLayer() {
  const previewRgbaPath = useTaskStore((state) => state.previewRgbaPath);

  if (!previewRgbaPath) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-[24px] bg-[var(--panel)]"
      />
    );
  }

  return (
    <img
      alt="Cutout preview"
      className="absolute inset-0 h-full w-full rounded-[24px] object-contain"
      src={previewRgbaPath}
    />
  );
}
