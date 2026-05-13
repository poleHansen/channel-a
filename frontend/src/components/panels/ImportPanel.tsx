import type { ChangeEvent } from "react";
import { useId, useRef, useState } from "react";

import { uploadAutoSegment } from "../../lib/api/client";
import { useTaskStore } from "../../state/taskStore";

export function ImportPanel() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const previewRgbaPath = useTaskStore((state) => state.previewRgbaPath);
  const clearAutoSegmentResult = useTaskStore(
    (state) => state.clearAutoSegmentResult,
  );
  const setAutoSegmentResult = useTaskStore(
    (state) => state.setAutoSegmentResult,
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    clearAutoSegmentResult();

    try {
      const result = await uploadAutoSegment(file);
      setAutoSegmentResult(result);
    } catch (error) {
      clearAutoSegmentResult();
      setErrorMessage(
        error instanceof Error ? error.message : "Auto segmentation failed.",
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
            Upload a source image to trigger auto segmentation.
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
      {errorMessage ? (
        <p aria-live="assertive" className="mt-3 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
