import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { BorderId } from "@/lib/types";
import { cn } from "@/lib/utils";

function VineCorner({ className }: { className?: string }) {
  return (
    <span className={cn("paper-corner", className)}>
      <svg viewBox="0 0 52 52" fill="none" aria-hidden>
        <path
          d="M4 48c6-18 14-28 30-34M8 44c10-4 22-6 36-4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="40" r="1.6" fill="currentColor" />
        <circle cx="34" cy="16" r="1.4" fill="currentColor" />
      </svg>
    </span>
  );
}

function formatIn(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "") || "0";
}

export function PageSheet({
  border,
  oversized,
  width = 8.5,
  height = 11,
  showRuler = true,
  children,
  className,
}: {
  border: BorderId;
  oversized?: boolean;
  width?: number;
  height?: number;
  showRuler?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function track(event: PointerEvent<HTMLDivElement>) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    setPos({
      x: Math.min(width, Math.max(0, x)),
      y: Math.min(height, Math.max(0, y)),
    });
  }

  const frameStyle = {
    "--page-w": `${width}in`,
    "--page-h": `${height}in`,
  } as CSSProperties;

  const sheet = (
    <div
      ref={sheetRef}
      data-border={border}
      className={cn("paper-sheet", oversized && "is-oversized", className)}
    >
      {border === "vine" ? (
        <>
          <VineCorner className="top-1 left-1" />
          <VineCorner className="top-1 right-1 rotate-90" />
          <VineCorner className="bottom-1 left-1 -rotate-90" />
          <VineCorner className="right-1 bottom-1 rotate-180" />
        </>
      ) : null}
      {children}
    </div>
  );

  if (!showRuler) {
    return (
      <div className="page-frame is-bare" style={frameStyle}>
        {sheet}
      </div>
    );
  }
  return (
    <div
      className="page-frame"
      style={frameStyle}
      onPointerMove={track}
      onPointerLeave={() => setPos(null)}
    >
      <div className="ruler-corner" aria-hidden>
        {pos ? (
          <span>
            {formatIn(pos.x)}×{formatIn(pos.y)}
          </span>
        ) : (
          <span>
            {formatIn(width)}×{formatIn(height)}
          </span>
        )}
      </div>
      <div className="ruler ruler-x" aria-hidden>
        <span className="ruler-end is-start">0</span>
        <span className="ruler-end is-finish">{formatIn(width)}</span>
        {pos ? (
          <span className="ruler-cursor" style={{ left: `${(pos.x / width) * 100}%` }}>
            <span className="ruler-readout">{formatIn(pos.x)} in</span>
          </span>
        ) : null}
      </div>
      <div className="ruler ruler-y" aria-hidden>
        <span className="ruler-end is-start">0</span>
        <span className="ruler-end is-finish">{formatIn(height)}</span>
        {pos ? (
          <span className="ruler-cursor" style={{ top: `${(pos.y / height) * 100}%` }}>
            <span className="ruler-readout">{formatIn(pos.y)} in</span>
          </span>
        ) : null}
      </div>
      {sheet}
    </div>
  );
}
