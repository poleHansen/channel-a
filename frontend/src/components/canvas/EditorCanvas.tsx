import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { applyBrushStroke, refineInteractiveSegment } from "../../lib/api/client";
import { CanvasMaskLayer } from "./CanvasMaskLayer";
import type {
  BrushPoint,
  BrushStroke,
  ExportAspectRatio,
  ExportBox,
  PromptBox,
  PromptPoint,
} from "../../types/editor";
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

function normalizeBox(
  start: { x: number; y: number },
  end: { x: number; y: number },
): ExportBox {
  return {
    x0: Math.min(start.x, end.x),
    y0: Math.min(start.y, end.y),
    x1: Math.max(start.x, end.x),
    y1: Math.max(start.y, end.y),
  };
}

function parseAspectRatio(aspectRatio: ExportAspectRatio): number | null {
  if (aspectRatio === "free") {
    return null;
  }

  const [width, height] = aspectRatio.split(":").map(Number);
  if (!width || !height) {
    return null;
  }

  return width / height;
}

function constrainPointToAspectRatio(
  start: { x: number; y: number },
  current: { x: number; y: number },
  imageSize: ImageSize | null,
  aspectRatio: ExportAspectRatio,
) {
  const ratio = parseAspectRatio(aspectRatio);
  if (!ratio || !imageSize) {
    return current;
  }

  const dx = current.x - start.x;
  const dy = current.y - start.y;

  if (dx === 0 && dy === 0) {
    return current;
  }

  const signX = dx < 0 ? -1 : 1;
  const signY = dy < 0 ? -1 : 1;
  const maxWidth = signX > 0 ? imageSize.width - start.x : start.x;
  const maxHeight = signY > 0 ? imageSize.height - start.y : start.y;
  const rawWidth = Math.abs(dx);
  const rawHeight = Math.abs(dy);
  const widthDriven = rawHeight === 0 || rawWidth / Math.max(rawHeight, 1) >= ratio;

  let width = widthDriven ? rawWidth : rawHeight * ratio;
  let height = widthDriven ? rawWidth / ratio : rawHeight;

  const widthScale = width > 0 ? maxWidth / width : 1;
  const heightScale = height > 0 ? maxHeight / height : 1;
  const scale = Math.min(1, widthScale, heightScale);
  width *= scale;
  height *= scale;

  return {
    x: Math.round(start.x + signX * width),
    y: Math.round(start.y + signY * height),
  };
}

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeTool = useEditorStore((state) => state.activeTool);
  const appendDraftPoint = useEditorStore((state) => state.appendDraftPoint);
  const addPromptPoint = useEditorStore((state) => state.addPromptPoint);
  const brushSize = useEditorStore((state) => state.brushSize);
  const clearDraftStroke = useEditorStore((state) => state.clearDraftStroke);
  const draftStroke = useEditorStore((state) => state.draftStroke);
  const exportAspectRatio = useEditorStore((state) => state.exportAspectRatio);
  const exportBox = useEditorStore((state) => state.exportBox);
  const isApplyingBrush = useEditorStore((state) => state.isApplyingBrush);
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const promptPoints = useEditorStore((state) => state.promptPoints);
  const setDraftStroke = useEditorStore((state) => state.setDraftStroke);
  const setExportBox = useEditorStore((state) => state.setExportBox);
  const setIsApplyingBrush = useEditorStore((state) => state.setIsApplyingBrush);
  const setIsDrawing = useEditorStore((state) => state.setIsDrawing);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const previewRgbaPath = useTaskStore((state) => state.previewRgbaPath);
  const setEditAvailability = useTaskStore((state) => state.setEditAvailability);
  const setPreviewRgbaPath = useTaskStore((state) => state.setPreviewRgbaPath);
  const [displayBox, setDisplayBox] = useState<DisplayBox | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [brushCursorPoint, setBrushCursorPoint] = useState<BrushPoint | null>(null);
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

  function isBrushTool(tool: typeof activeTool): tool is BrushStroke["tool"] {
    return tool === "brush-add" || tool === "brush-remove";
  }

  async function runRefine(nextPoints: PromptPoint[], boxes: PromptBox[]) {
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
    if (
      !previewRgbaPath ||
      activeTool === "box" ||
      activeTool === "export-box" ||
      isBrushTool(activeTool) ||
      isRefining
    ) {
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
    if (!previewRgbaPath || isRefining || isApplyingBrush) {
      return;
    }

    if (isBrushTool(activeTool)) {
      const point = mapClientPointToImage(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      setErrorMessage(null);
      setDraftStroke({
        tool: activeTool,
        size: brushSize,
        softness: 0.35,
        points: [point],
      });
      setIsDrawing(true);
      return;
    }

    if (activeTool !== "box" && activeTool !== "export-box") {
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
    if (isBrushTool(activeTool)) {
      setBrushCursorPoint(mapClientPointToImage(event.clientX, event.clientY));
    }

    if (isDrawing && draftStroke && isBrushTool(activeTool)) {
      const point = mapClientPointToImage(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      const previous = draftStroke.points[draftStroke.points.length - 1];
      if (!previous) {
        appendDraftPoint(point);
        return;
      }

      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      if (distance >= 2) {
        appendDraftPoint(point);
      }
      return;
    }

    if (!dragStart) {
      return;
    }

    const point = mapClientPointToImage(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setDragCurrent(
      activeTool === "export-box"
        ? constrainPointToAspectRatio(dragStart, point, imageSize, exportAspectRatio)
        : point,
    );
  }

  async function handlePointerUp(event: ReactMouseEvent<HTMLDivElement>) {
    if (isDrawing && draftStroke && isBrushTool(activeTool)) {
      setIsDrawing(false);

      const releasePoint = mapClientPointToImage(event.clientX, event.clientY);
      setBrushCursorPoint(releasePoint);
      const strokeToApply: BrushStroke = releasePoint
        ? {
            ...draftStroke,
            points: [...draftStroke.points, releasePoint],
          }
        : draftStroke;

      if (!currentTaskId || strokeToApply.points.length === 0) {
        clearDraftStroke();
        return;
      }

      setIsApplyingBrush(true);
      setErrorMessage(null);
      try {
        const result = await applyBrushStroke(currentTaskId, strokeToApply);
        setPreviewRgbaPath(withCacheBust(result.previewRgbaPath));
        setEditAvailability(result.canUndo, result.canRedo);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Brush request failed.");
      } finally {
        clearDraftStroke();
        setIsApplyingBrush(false);
      }
      return;
    }

    if (
      !dragStart ||
      (activeTool !== "box" && activeTool !== "export-box") ||
      isRefining
    ) {
      return;
    }

    const point = mapClientPointToImage(event.clientX, event.clientY) ?? dragCurrent;
    const start = dragStart;

    setDragStart(null);
    setDragCurrent(null);

    if (!point) {
      return;
    }

    const nextPoint =
      activeTool === "export-box"
        ? constrainPointToAspectRatio(start, point, imageSize, exportAspectRatio)
        : point;
    const box = normalizeBox(start, nextPoint);

    if (box.x1 - box.x0 < 2 || box.y1 - box.y0 < 2) {
      return;
    }

    if (activeTool === "export-box") {
      setExportBox(box);
      return;
    }

    await runRefine(promptPoints, [box]);
  }

  const dragBox =
    dragStart && dragCurrent
      ? normalizeBox(dragStart, dragCurrent)
      : null;

  return (
    <div
      aria-label="Editor canvas"
      className="clay-inset relative flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[30px] border border-[var(--border)] md:min-h-[620px] lg:min-h-0 lg:flex-1"
      onClick={handleCanvasClick}
      onMouseDown={handlePointerDown}
      onMouseLeave={(event) => {
        setBrushCursorPoint(null);
        void handlePointerUp(event);
      }}
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
              activeTool === "box" || activeTool === "export-box"
                ? "cursor-crosshair"
                : isBrushTool(activeTool)
                  ? "cursor-none"
                  : "cursor-cell"
            }`}
          >
            <CanvasMaskLayer
              brushCursor={
                brushCursorPoint && isBrushTool(activeTool)
                  ? {
                      x: brushCursorPoint.x,
                      y: brushCursorPoint.y,
                      size: brushSize,
                      tool: activeTool,
                    }
                  : null
              }
              displayBox={displayBox}
              draftStroke={draftStroke}
              exportBox={exportBox}
              exportDraftBox={activeTool === "export-box" ? dragBox : null}
              imageSize={imageSize}
            />
            {displayBox && imageSize
              ? promptPoints.map((point, index) => (
                  <span
                    className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm ${
                      point.type === "positive" ? "bg-[var(--accent)]" : "bg-[var(--accent-pink)]"
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
            {displayBox && imageSize && dragBox && activeTool === "box" ? (
              <span
                className="absolute border-2 border-[var(--text)] bg-white/10"
                style={{
                  left:
                    displayBox.left +
                    (dragBox.x0 / imageSize.width) * displayBox.width,
                  top:
                    displayBox.top + (dragBox.y0 / imageSize.height) * displayBox.height,
                  width: ((dragBox.x1 - dragBox.x0) / imageSize.width) * displayBox.width,
                  height: ((dragBox.y1 - dragBox.y0) / imageSize.height) * displayBox.height,
                }}
              />
            ) : null}
          </div>
        </>
      )}
      {isRefining || isApplyingBrush ? (
        <p className="clay-button absolute bottom-4 right-4 rounded-full px-3 py-1 text-xs text-[var(--muted)]">
          {isApplyingBrush ? "Applying..." : "Refining..."}
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
