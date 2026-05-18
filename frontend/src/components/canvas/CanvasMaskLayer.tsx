import type { BrushStroke } from "../../types/editor";

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

interface CanvasMaskLayerProps {
  displayBox: DisplayBox | null;
  draftStroke: BrushStroke | null;
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
  displayBox,
  draftStroke,
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

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,transparent_0%,transparent_40%,rgba(255,255,255,0.18)_100%)]"
    >
      {displayBox && imageSize && draftStroke ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {draftStroke.points.map((point, index) => (
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
        </svg>
      ) : null}
    </div>
  );
}
