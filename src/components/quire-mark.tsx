import { cn } from "@/lib/utils";

export function QuireMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect x="4" y="7" width="16" height="21" rx="2" fill="currentColor" opacity="0.32" />
      <rect x="8" y="5" width="16" height="21" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="12" y="3" width="16" height="21" rx="2" fill="currentColor" />
    </svg>
  );
}
