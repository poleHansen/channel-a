import { useState } from "react";

import { exportSegmentResult } from "../../lib/api/client";
import { useTaskStore } from "../../state/taskStore";

export function ExportPanel() {
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportingFormat, setIsExportingFormat] = useState<"rgb" | "rgba" | null>(
    null,
  );

  async function handleExport(format: "rgb" | "rgba") {
    if (!currentTaskId || isExportingFormat) {
      return;
    }

    setIsExportingFormat(format);
    setErrorMessage(null);

    try {
      const outputPath = await exportSegmentResult({
        taskId: currentTaskId,
        format,
      });
      const anchor = document.createElement("a");
      anchor.href = outputPath;
      anchor.download = outputPath.split("/").pop() ?? "";
      anchor.click();
      anchor.remove();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExportingFormat(null);
    }
  }

  const isDisabled = currentTaskId === null || isExportingFormat !== null;

  return (
    <section className="clay-card mt-5 rounded-[28px] p-4">
      <h3 className="text-sm font-semibold">Export</h3>
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
        {currentTaskId
          ? "Choose a format to download the current cutout result."
          : "Import and refine an image before exporting."}
      </p>
      {errorMessage ? (
        <p aria-live="assertive" className="mt-3 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
