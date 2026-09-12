import type { CSSProperties } from "react";
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

function inchTicks(length: number) {
  const ticks: { at: number; kind: "inch" | "half" | "quarter" }[] = [];
  const steps = Math.round(length * 4);
  for (let i = 0; i <= steps; i += 1) {
    const at = i / 4;
    ticks.push({
      at,
      kind: i % 4 === 0 ? "inch" : i % 2 === 0 ? "half" : "quarter",
    });
  }
  return ticks;
}

export function PageSheet({
  border,
  oversized,
  width = 8.5,
  height = 11,
  children,
  className,
}: {
  border: BorderId;
  oversized?: boolean;
  width?: number;
  height?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const across = inchTicks(width);
  const down = inchTicks(height);

  return (
    <div
      className="page-frame"
      style={
        {
          "--page-w": `${width}in`,
          "--page-h": `${height}in`,
        } as CSSProperties
      }
    >
      <div className="ruler-corner" aria-hidden>
        in
      </div>
      <div className="ruler ruler-x" aria-hidden>
        {across.map((tick) => (
          <span
            key={`x-${tick.at}`}
            className={`ruler-tick is-${tick.kind}`}
            style={{ left: `${(tick.at / width) * 100}%` }}
          >
            {tick.kind === "inch" ? <span className="ruler-label">{tick.at}</span> : null}
          </span>
        ))}
      </div>
      <div className="ruler ruler-y" aria-hidden>
        {down.map((tick) => (
          <span
            key={`y-${tick.at}`}
            className={`ruler-tick is-${tick.kind}`}
            style={{ top: `${(tick.at / height) * 100}%` }}
          >
            {tick.kind === "inch" ? <span className="ruler-label">{tick.at}</span> : null}
          </span>
        ))}
      </div>
      <div
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
    </div>
  );
}
