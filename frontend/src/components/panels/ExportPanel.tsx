import { useState } from "react";

import { exportSegmentResult, listTasks, saveTaskSnapshot } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

export function ExportPanel() {
  const clearDraftStroke = useEditorStore((state) => state.clearDraftStroke);
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
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
