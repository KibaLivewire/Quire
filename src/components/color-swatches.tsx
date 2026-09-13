import { FOLDER_SWATCHES } from "@/lib/folders";
import { cn } from "@/lib/utils";

export function ColorSwatches({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FOLDER_SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Color ${color}`}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            "size-5 rounded-full border border-black/15",
            value === color && "ring-2 ring-forest ring-offset-1 ring-offset-paper-raised",
          )}
          style={{ background: color }}
        />
      ))}
      <label className="relative size-5 overflow-hidden rounded-full border border-dashed border-rule" title="Custom color">
        <input
          type="color"
          value={value && /^#/.test(value) ? value : "#3d6b4f"}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Custom color"
        />
        <span className="pointer-events-none absolute inset-0 bg-[conic-gradient(#3d6b4f,#c4a35a,#8a3d45,#4f6f8f,#3d6b4f)]" />
      </label>
    </div>
  );
}
