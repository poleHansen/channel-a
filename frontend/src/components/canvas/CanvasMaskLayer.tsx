import type { BrushStroke, ExportBox } from "../../types/editor";

interface DisplayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ImageSize {
  width: number;
  height: number;
}

interface BrushCursor {
  size: number;
  tool: BrushStroke["tool"];
  x: number;
  y: number;
}

interface CanvasMaskLayerProps {
  brushCursor: BrushCursor | null;
  displayBox: DisplayBox | null;
  draftStroke: BrushStroke | null;
  exportBox: ExportBox | null;
  exportDraftBox: ExportBox | null;
  imageSize: ImageSize | null;
}

function toDisplayPoint(
  value: number,
  axisSize: number,
  boxOffset: number,
  boxSize: number,
) {
  return boxOffset + (value / axisSize) * boxSize;
}

export function CanvasMaskLayer({
  brushCursor,
  displayBox,
  draftStroke,
  exportBox,
  exportDraftBox,
  imageSize,
}: CanvasMaskLayerProps) {
  const strokeColor =
    draftStroke?.tool === "brush-remove"
      ? "rgba(197, 95, 87, 0.32)"
      : "rgba(92, 166, 133, 0.28)";
  const outlineColor =
    draftStroke?.tool === "brush-remove"
      ? "rgba(166, 68, 61, 0.58)"
      : "rgba(61, 131, 103, 0.52)";
  const cursorFill =
    brushCursor?.tool === "brush-remove"
      ? "rgba(197, 95, 87, 0.12)"
      : "rgba(92, 166, 133, 0.1)";
  const cursorStroke =
    brushCursor?.tool === "brush-remove"
      ? "rgba(166, 68, 61, 0.95)"
      : "rgba(61, 131, 103, 0.92)";

  function renderExportRect(box: ExportBox, key: string, isDraft: boolean) {
    if (!displayBox || !imageSize) {
      return null;
    }

    const left = toDisplayPoint(box.x0, imageSize.width, displayBox.left, displayBox.width);
    const top = toDisplayPoint(box.y0, imageSize.height, displayBox.top, displayBox.height);
    const right = toDisplayPoint(box.x1, imageSize.width, displayBox.left, displayBox.width);
    const bottom = toDisplayPoint(box.y1, imageSize.height, displayBox.top, displayBox.height);

    return (
      <g key={key}>
        <rect
          fill={isDraft ? "rgba(38, 130, 255, 0.1)" : "rgba(38, 130, 255, 0.12)"}
          height={Math.max(0, bottom - top)}
          rx="10"
          ry="10"
          stroke={isDraft ? "rgba(38, 130, 255, 0.95)" : "rgba(17, 95, 204, 0.98)"}
          strokeDasharray={isDraft ? "8 6" : "10 5"}
          strokeWidth={isDraft ? "2" : "2.5"}
          width={Math.max(0, right - left)}
          x={left}
          y={top}
        />
        {!isDraft ? (
          <rect
            fill="none"
            height={Math.max(0, bottom - top) + 10}
            rx="14"
            ry="14"
            stroke="rgba(255, 255, 255, 0.55)"
            strokeDasharray="3 9"
            strokeWidth="1"
            width={Math.max(0, right - left) + 10}
            x={left - 5}
            y={top - 5}
          />
        ) : null}
      </g>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,transparent_0%,transparent_40%,rgba(255,255,255,0.18)_100%)]"
    >
      {displayBox && imageSize && (draftStroke || brushCursor || exportBox || exportDraftBox) ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {exportBox ? renderExportRect(exportBox, "export-box", false) : null}
          {exportDraftBox ? renderExportRect(exportDraftBox, "export-draft-box", true) : null}
          {draftStroke?.points.map((point, index) => (
            <circle
              cx={toDisplayPoint(point.x, imageSize.width, displayBox.left, displayBox.width)}
              cy={toDisplayPoint(point.y, imageSize.height, displayBox.top, displayBox.height)}
              fill={strokeColor}
              key={`${point.x}-${point.y}-${index}`}
              r={Math.max(
                3,
                ((draftStroke.size / imageSize.width) * displayBox.width) / 2,
              )}
              stroke={outlineColor}
              strokeWidth="1"
            />
          ))}
          {brushCursor ? (
            <g>
              <circle
                cx={toDisplayPoint(
                  brushCursor.x,
                  imageSize.width,
                  displayBox.left,
                  displayBox.width,
                )}
                cy={toDisplayPoint(
                  brushCursor.y,
                  imageSize.height,
                  displayBox.top,
                  displayBox.height,
                )}
                fill={cursorFill}
                r={Math.max(
                  3,
                  ((brushCursor.size / imageSize.width) * displayBox.width) / 2,
                )}
                stroke={cursorStroke}
                strokeDasharray="4 3"
                strokeWidth="1.5"
              />
              <line
                stroke={cursorStroke}
                strokeLinecap="round"
                strokeWidth="1.5"
                x1={
                  toDisplayPoint(
                    brushCursor.x,
                    imageSize.width,
                    displayBox.left,
                    displayBox.width,
                  ) - 6
                }
                x2={
                  toDisplayPoint(
                    brushCursor.x,
                    imageSize.width,
                    displayBox.left,
                    displayBox.width,
                  ) + 6
                }
                y1={toDisplayPoint(
                  brushCursor.y,
                  imageSize.height,
                  displayBox.top,
                  displayBox.height,
                )}
                y2={toDisplayPoint(
                  brushCursor.y,
                  imageSize.height,
                  displayBox.top,
                  displayBox.height,
                )}
              />
              <line
                stroke={cursorStroke}
                strokeLinecap="round"
                strokeWidth="1.5"
                x1={toDisplayPoint(
                  brushCursor.x,
                  imageSize.width,
                  displayBox.left,
                  displayBox.width,
                )}
                x2={toDisplayPoint(
                  brushCursor.x,
                  imageSize.width,
                  displayBox.left,
                  displayBox.width,
                )}
                y1={
                  toDisplayPoint(
                    brushCursor.y,
                    imageSize.height,
                    displayBox.top,
                    displayBox.height,
                  ) - 6
                }
                y2={
                  toDisplayPoint(
                    brushCursor.y,
                    imageSize.height,
                    displayBox.top,
                    displayBox.height,
                  ) + 6
                }
              />
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
