import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_ADJUST, editStyle, isGifSrc, renderEditedImage, type ImageAdjust, type ImageFilter } from "@/lib/image-edit";
import { cn } from "@/lib/utils";

const FILTERS: { id: ImageFilter; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "grayscale", label: "Graphite" },
  { id: "sepia", label: "Sepia" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "contrast", label: "Punch" },
];

const ASPECTS: { id: ImageAdjust["aspect"]; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "square", label: "Square" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
];

export function ImageEditor({
  open,
  src,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  src: string | null;
  onOpenChange: (open: boolean) => void;
  onApply: (result: { src?: string; editStyle?: string | null }) => void;
}) {
  const [adj, setAdj] = useState<ImageAdjust>(DEFAULT_ADJUST);
  const [busy, setBusy] = useState(false);
  const gif = Boolean(src && isGifSrc(src));

  useEffect(() => {
    if (open) setAdj(DEFAULT_ADJUST);
  }, [open, src]);

  const previewFilter = useMemo(() => {
    const parts = [
      `brightness(${adj.brightness}%)`,
      `contrast(${adj.contrast}%)`,
      `saturate(${adj.saturate}%)`,
    ];
    if (adj.filter === "grayscale") parts.push("grayscale(1)");
    if (adj.filter === "sepia") parts.push("sepia(0.7)");
    if (adj.filter === "warm") parts.push("sepia(0.25) saturate(1.15)");
    if (adj.filter === "cool") parts.push("hue-rotate(190deg) saturate(0.85)");
    if (adj.filter === "contrast") parts.push("contrast(1.25) saturate(1.1)");
    return parts.join(" ");
  }, [adj]);

  async function apply() {
    if (!src) return;
    setBusy(true);
    try {
      if (gif) {
        onApply({ editStyle: editStyle(adj) });
      } else {
        const next = await renderEditedImage(src, adj);
        onApply({ src: next, editStyle: null });
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save that edit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100%-1.5rem),36rem)]">
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
          <DialogDescription>
          {gif
            ? "This GIF will keep moving. Color, rotate, and flip are applied without freezing the frames. Crop is skipped."
            : "Crop, rotate, and tune a picture on this page."}
        </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-2xl bg-paper-inset">
          {src ? (
            <img
              src={src}
              alt="Image being edited"
              className="mx-auto max-h-64 object-contain"
              style={{
                filter: previewFilter,
                transform: `rotate(${adj.rotate}deg) scale(${adj.flipH ? -1 : 1}, ${adj.flipV ? -1 : 1})`,
              }}
            />
          ) : null}
        </div>
        <div className="grid gap-3 px-1 pt-2">
          {gif ? null : (
            <div className="flex flex-wrap gap-1.5">
              {ASPECTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs",
                    adj.aspect === item.id ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted",
                  )}
                  onClick={() => setAdj((prev) => ({ ...prev, aspect: item.id }))}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs",
                  adj.filter === item.id ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted",
                )}
                onClick={() => setAdj((prev) => ({ ...prev, filter: item.id }))}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setAdj((prev) => ({ ...prev, rotate: ((prev.rotate + 270) % 360) as ImageAdjust["rotate"] }))
              }
            >
              Rotate left
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setAdj((prev) => ({ ...prev, rotate: ((prev.rotate + 90) % 360) as ImageAdjust["rotate"] }))
              }
            >
              Rotate right
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAdj((prev) => ({ ...prev, flipH: !prev.flipH }))}>
              Flip
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAdj((prev) => ({ ...prev, flipV: !prev.flipV }))}>
              Flip vertical
            </Button>
          </div>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs text-ink-muted">Brightness</Label>
              <Slider
                min={40}
                max={160}
                value={[adj.brightness]}
                onValueChange={([value]) => setAdj((prev) => ({ ...prev, brightness: value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-ink-muted">Contrast</Label>
              <Slider
                min={40}
                max={160}
                value={[adj.contrast]}
                onValueChange={([value]) => setAdj((prev) => ({ ...prev, contrast: value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-ink-muted">Color</Label>
              <Slider
                min={0}
                max={180}
                value={[adj.saturate]}
                onValueChange={([value]) => setAdj((prev) => ({ ...prev, saturate: value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void apply()} disabled={busy}>
            {busy ? "Saving" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
