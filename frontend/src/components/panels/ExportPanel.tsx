import { useState } from "react";

import { exportSegmentResult, listTasks, saveTaskSnapshot } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";
import type { ExportAspectRatio, ExportSizeMode } from "../../types/editor";

const EXPORT_ASPECT_RATIO_OPTIONS: Array<{
  label: string;
  value: ExportAspectRatio;
}> = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "3:4", value: "3:4" },
  { label: "4:5", value: "4:5" },
  { label: "16:9", value: "16:9" },
];

const EXPORT_SIZE_MODE_OPTIONS: Array<{
  label: string;
  value: ExportSizeMode;
}> = [
  { label: "Crop bounds", value: "crop-size" },
  { label: "Original canvas", value: "original-size" },
];

function clampPadding(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

export function ExportPanel() {
  const clearExportBox = useEditorStore((state) => state.clearExportBox);
  const clearDraftStroke = useEditorStore((state) => state.clearDraftStroke);
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
  const exportAspectRatio = useEditorStore((state) => state.exportAspectRatio);
  const exportBox = useEditorStore((state) => state.exportBox);
  const exportPadding = useEditorStore((state) => state.exportPadding);
  const exportSizeMode = useEditorStore((state) => state.exportSizeMode);
  const setExportAspectRatio = useEditorStore((state) => state.setExportAspectRatio);
  const setExportPadding = useEditorStore((state) => state.setExportPadding);
  const setExportSizeMode = useEditorStore((state) => state.setExportSizeMode);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const selectedTaskIds = useTaskStore((state) => state.selectedTaskIds);
  const setCurrentTask = useTaskStore((state) => state.setCurrentTask);
  const setTaskHistory = useTaskStore((state) => state.setTaskHistory);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingFormat, setIsExportingFormat] = useState<"rgb" | "rgba" | null>(
    null,
  );

  async function handleExport(format: "rgb" | "rgba") {
    const taskIds = selectedTaskIds.length > 0 ? selectedTaskIds : currentTaskId ? [currentTaskId] : [];

    if (taskIds.length === 0 || isExportingFormat) {
      return;
    }

    setIsExportingFormat(format);
    setErrorMessage(null);

    try {
      for (const taskId of taskIds) {
        const outputPath = await exportSegmentResult({
          taskId,
          format,
          cropBox: exportBox,
          aspectRatio: exportAspectRatio,
          paddingPercent: exportPadding,
          sizeMode: exportSizeMode,
        });
        const anchor = document.createElement("a");
        anchor.href = outputPath;
        anchor.download = outputPath.split("/").pop() ?? "";
        anchor.click();
        anchor.remove();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExportingFormat(null);
    }
  }

  async function handleSave() {
    if (!currentTaskId || isSaving || isExportingFormat) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await saveTaskSnapshot(currentTaskId);
      const tasks = await listTasks();
      clearDraftStroke();
      clearPromptPoints();
      setCurrentTask(result.currentTask);
      setTaskHistory(tasks);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const exportTargetCount = selectedTaskIds.length > 0 ? selectedTaskIds.length : currentTaskId ? 1 : 0;
  const isDisabled = exportTargetCount === 0 || isExportingFormat !== null;
  const canSave = currentTaskId !== null;

  return (
    <section className="clay-card mt-5 rounded-[28px] p-4">
      <h3 className="text-sm font-semibold">Export</h3>
      <button
        className="clay-button mt-3 w-full rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSave || isSaving || isExportingFormat !== null}
        onClick={() => void handleSave()}
        type="button"
      >
        {isSaving ? "Saving..." : "Save to history"}
      </button>
      <div className="mt-4 space-y-3 rounded-[22px] border border-[var(--border)] bg-white/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Export crop
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {exportBox ? "Using the current export box from the canvas." : "No export box set."}
            </p>
          </div>
          <button
            className="clay-button rounded-full px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!exportBox || isSaving || isExportingFormat !== null}
            onClick={() => clearExportBox()}
            type="button"
          >
            Clear box
          </button>
        </div>
        <label className="block text-xs font-medium text-[var(--text)]">
          Aspect ratio
          <select
            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-white/85 px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2"
            onChange={(event) => setExportAspectRatio(event.target.value as ExportAspectRatio)}
            value={exportAspectRatio}
          >
            {EXPORT_ASPECT_RATIO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[var(--text)]">
          Size mode
          <select
            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-white/85 px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2"
            onChange={(event) => setExportSizeMode(event.target.value as ExportSizeMode)}
            value={exportSizeMode}
          >
            {EXPORT_SIZE_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[var(--text)]">
          Padding
          <div className="mt-1 flex items-center gap-3">
            <input
              className="h-2 flex-1 accent-[var(--text)]"
              max={100}
              min={0}
              onChange={(event) => setExportPadding(clampPadding(Number(event.target.value)))}
              type="range"
              value={exportPadding}
            />
            <div className="flex items-center gap-2">
              <input
                className="w-16 rounded-2xl border border-[var(--border)] bg-white/85 px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2"
                max={100}
                min={0}
                onChange={(event) =>
                  setExportPadding(clampPadding(Number(event.target.value)))
                }
                type="number"
                value={exportPadding}
              />
              <span className="text-xs text-[var(--muted)]">%</span>
            </div>
          </div>
        </label>
      </div>
      <div className="mt-3 flex gap-3">
        <button
          className="clay-button rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          onClick={() => handleExport("rgba")}
          type="button"
        >
          {isExportingFormat === "rgba" ? "Exporting..." : "RGBA PNG"}
        </button>
        <button
          className="clay-button rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          onClick={() => handleExport("rgb")}
          type="button"
        >
          {isExportingFormat === "rgb" ? "Exporting..." : "RGB JPG"}
        </button>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        {exportTargetCount === 0
          ? "Import and refine an image before exporting."
          : exportTargetCount === 1 && selectedTaskIds.length === 0
            ? "Choose a format to download the current cutout result."
            : `Choose a format to download ${exportTargetCount} selected projects.`}
      </p>
      {errorMessage ? (
        <p aria-live="assertive" className="mt-3 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
