import type { BorderId, PageOrientation } from "@/lib/types";
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

export function PageSheet({
  border,
  oversized,
  orientation = "portrait",
  children,
  className,
}: {
  border: BorderId;
  oversized?: boolean;
  orientation?: PageOrientation;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-border={border}
      data-page={orientation}
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
}
