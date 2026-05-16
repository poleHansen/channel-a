import type { ChangeEvent } from "react";
import { useId, useRef, useState } from "react";

import { createTaskFromUpload } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";
import type { TaskMode } from "../../types/task";

export function ImportPanel() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<TaskMode>("auto");
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const previewRgbaPath = useTaskStore((state) => state.previewRgbaPath);
  const clearAutoSegmentResult = useTaskStore(
    (state) => state.clearAutoSegmentResult,
  );
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
  const setCurrentTask = useTaskStore((state) => state.setCurrentTask);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    clearAutoSegmentResult();
    clearPromptPoints();

    try {
      const result = await createTaskFromUpload(file, uploadMode);
      setCurrentTask(result);
    } catch (error) {
      clearAutoSegmentResult();
      setErrorMessage(
        error instanceof Error ? error.message : "Task creation failed.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="mt-5 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.35)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Import image</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Choose whether upload should auto cut out immediately or start in manual mode.
          </p>
        </div>
        <button
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isUploading ? "Uploading..." : "Choose file"}
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        {(["auto", "manual"] as const).map((mode) => (
          <button
            className={`rounded-full border px-3 py-1 text-xs transition ${
              uploadMode === mode
                ? "border-[var(--text)] bg-[var(--text)] text-[var(--panel)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-white/60"
            }`}
            key={mode}
            onClick={() => setUploadMode(mode)}
            type="button"
          >
            {mode === "auto" ? "Auto cutout" : "Manual Keep/Remove"}
          </button>
        ))}
      </div>
      <input
        accept="image/*"
        className="sr-only"
        disabled={isUploading}
        id={inputId}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      {currentTaskId ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Task: {currentTaskId}</p>
      ) : null}
      {previewRgbaPath ? (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Preview: {previewRgbaPath}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-[var(--muted)]">
        Current upload mode: {uploadMode === "auto" ? "Auto cutout" : "Manual Keep/Remove"}
      </p>
      {errorMessage ? (
        <p aria-live="assertive" className="mt-3 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
