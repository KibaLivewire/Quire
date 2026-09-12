import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      {children}
    </Drawer.Root>
  );
}

function SheetContent({
  className,
  children,
  side = "left",
}: {
  className?: string;
  children: React.ReactNode;
  side?: "left" | "bottom";
}) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <Drawer.Content
        className={cn(
          "fixed z-50 flex flex-col bg-leather text-cream outline-none",
          side === "left"
            ? "inset-y-0 left-0 w-[min(18rem,88vw)]"
            : "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl",
          className,
        )}
      >
        {side === "bottom" && (
          <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-cream/20" />
        )}
        {children}
      </Drawer.Content>
    </Drawer.Portal>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn("font-display text-lg font-semibold", className)} {...props} />;
}

export { Sheet, SheetContent, SheetTitle };
