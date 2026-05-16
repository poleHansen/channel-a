import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { refineInteractiveSegment } from "../../lib/api/client";
import type { PromptPoint } from "../../types/editor";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

interface ImageSize {
  width: number;
  height: number;
}

interface DisplayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function computeDisplayBox(
  containerWidth: number,
  containerHeight: number,
  imageSize: ImageSize | null,
): DisplayBox | null {
  if (!imageSize || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const scale = Math.min(
    containerWidth / imageSize.width,
    containerHeight / imageSize.height,
  );
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

function withCacheBust(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${Date.now()}`;
}

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeTool = useEditorStore((state) => state.activeTool);
  const addPromptPoint = useEditorStore((state) => state.addPromptPoint);
  const promptPoints = useEditorStore((state) => state.promptPoints);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const previewRgbaPath = useTaskStore((state) => state.previewRgbaPath);
  const setEditAvailability = useTaskStore((state) => state.setEditAvailability);
  const setPreviewRgbaPath = useTaskStore((state) => state.setPreviewRgbaPath);
  const [displayBox, setDisplayBox] = useState<DisplayBox | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function updateDisplayBox() {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      setDisplayBox(
        computeDisplayBox(container.clientWidth, container.clientHeight, imageSize),
      );
    }

    updateDisplayBox();
    window.addEventListener("resize", updateDisplayBox);
    return () => window.removeEventListener("resize", updateDisplayBox);
  }, [imageSize, previewRgbaPath]);

  function mapClientPointToImage(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const container = containerRef.current;
    if (!container || !displayBox || !imageSize) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const xInImage = localX - displayBox.left;
    const yInImage = localY - displayBox.top;

    if (
      xInImage < 0 ||
      yInImage < 0 ||
      xInImage > displayBox.width ||
      yInImage > displayBox.height
    ) {
      return null;
    }

    return {
      x: Math.round((xInImage / displayBox.width) * imageSize.width),
      y: Math.round((yInImage / displayBox.height) * imageSize.height),
    };
  }

  async function runRefine(nextPoints: PromptPoint[], boxes: Array<Record<string, number>>) {
    if (!currentTaskId) {
      return;
    }

    setIsRefining(true);
    setErrorMessage(null);

    try {
      const result = await refineInteractiveSegment({
        taskId: currentTaskId,
        points: nextPoints,
        boxes,
      });
      setPreviewRgbaPath(withCacheBust(result.previewRgbaPath));
      setEditAvailability(result.canUndo, result.canRedo);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Interactive refinement failed.",
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function handleCanvasClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!previewRgbaPath || activeTool === "box" || isRefining) {
      return;
    }

    const point = mapClientPointToImage(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const nextPoint: PromptPoint = {
      ...point,
      type: activeTool === "remove-point" ? "negative" : "positive",
    };
    const nextPoints = [...promptPoints, nextPoint];
    addPromptPoint(nextPoint);
    await runRefine(nextPoints, []);
  }

  function handlePointerDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (!previewRgbaPath || activeTool !== "box" || isRefining) {
      return;
    }

    const point = mapClientPointToImage(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setDragStart(point);
    setDragCurrent(point);
  }

  function handlePointerMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragStart) {
      return;
    }

    const point = mapClientPointToImage(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setDragCurrent(point);
  }

  async function handlePointerUp(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragStart || activeTool !== "box" || isRefining) {
      return;
    }

    const point = mapClientPointToImage(event.clientX, event.clientY) ?? dragCurrent;
    const start = dragStart;

    setDragStart(null);
    setDragCurrent(null);

    if (!point) {
      return;
    }

    const box = {
      x0: Math.min(start.x, point.x),
      y0: Math.min(start.y, point.y),
      x1: Math.max(start.x, point.x),
      y1: Math.max(start.y, point.y),
    };

    if (box.x1 - box.x0 < 2 || box.y1 - box.y0 < 2) {
      return;
    }

    await runRefine(promptPoints, [box]);
  }

  const dragBox =
    dragStart && dragCurrent
      ? {
          left: Math.min(dragStart.x, dragCurrent.x),
          top: Math.min(dragStart.y, dragCurrent.y),
          width: Math.abs(dragCurrent.x - dragStart.x),
          height: Math.abs(dragCurrent.y - dragStart.y),
        }
      : null;

  return (
    <div
      aria-label="Editor canvas"
      className="clay-inset relative flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[30px] border border-[var(--border)] md:min-h-[620px] lg:min-h-0 lg:flex-1"
      onClick={handleCanvasClick}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      ref={containerRef}
      role="region"
    >
      {!previewRgbaPath ? (
        <p className="relative z-10 rounded-full bg-white/40 px-4 py-2 text-sm text-[var(--muted)]">
          Drop an image to begin
        </p>
      ) : (
        <>
          <img
            alt="Cutout preview"
            className="absolute inset-0 h-full w-full rounded-[30px] object-contain"
            onLoad={(event) => {
              const target = event.currentTarget;
              setImageSize({
                width: target.naturalWidth,
                height: target.naturalHeight,
              });
            }}
            src={previewRgbaPath}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 rounded-[30px] ${
              activeTool === "box" ? "cursor-crosshair" : "cursor-cell"
            }`}
          >
            {displayBox && imageSize
              ? promptPoints.map((point, index) => (
                  <span
                    className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm ${
                      point.type === "positive" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    key={`${point.type}-${point.x}-${point.y}-${index}`}
                    style={{
                      left:
                        displayBox.left + (point.x / imageSize.width) * displayBox.width,
                      top:
                        displayBox.top + (point.y / imageSize.height) * displayBox.height,
                    }}
                  />
                ))
              : null}
            {displayBox && imageSize && dragBox ? (
              <span
                className="absolute border-2 border-[var(--text)] bg-white/10"
                style={{
                  left:
                    displayBox.left +
                    (dragBox.left / imageSize.width) * displayBox.width,
                  top:
                    displayBox.top + (dragBox.top / imageSize.height) * displayBox.height,
                  width: (dragBox.width / imageSize.width) * displayBox.width,
                  height: (dragBox.height / imageSize.height) * displayBox.height,
                }}
              />
            ) : null}
          </div>
        </>
      )}
      {isRefining ? (
        <p className="clay-button absolute bottom-4 right-4 rounded-full px-3 py-1 text-xs text-[var(--muted)]">
          Refining...
        </p>
      ) : null}
      {errorMessage ? (
        <p
          aria-live="assertive"
          className="absolute left-4 top-4 rounded-full bg-[rgba(255,244,244,0.95)] px-3 py-1 text-xs text-[var(--danger)] shadow-[0_10px_18px_rgba(200,93,93,0.16)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
