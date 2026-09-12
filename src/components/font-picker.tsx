import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FONT_CATEGORIES,
  FONT_CATEGORY_LABEL,
  filterFonts,
  fontCssFamily,
  loadGoogleFont,
  type FontCategory,
  type WebFont,
} from "@/lib/font-catalog";
import { cn } from "@/lib/utils";

function FontRow({
  font,
  active,
  onPick,
}: {
  font: WebFont;
  active: boolean;
  onPick: (font: WebFont) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-baseline justify-between rounded-md px-2.5 py-2 text-left hover:bg-paper-inset",
        active && "bg-paper-inset",
      )}
      style={{ fontFamily: fontCssFamily(font) }}
      onMouseEnter={() => loadGoogleFont(font.family)}
      onFocus={() => loadGoogleFont(font.family)}
      onClick={() => onPick(font)}
    >
      <span className="text-sm">{font.family}</span>
      <span className="font-sans text-xs tracking-wide text-ink-subtle uppercase">
        {FONT_CATEGORY_LABEL[font.category]}
      </span>
    </button>
  );
}

export function FontPicker({ editor, current }: { editor: Editor; current?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");

  const fonts = useMemo(() => filterFonts(query, category), [query, category]);

  useEffect(() => {
    if (!open) return;
    fonts.slice(0, 12).forEach((font) => loadGoogleFont(font.family));
  }, [open, fonts]);

  function apply(font: WebFont) {
    loadGoogleFont(font.family);
    editor.chain().focus().setFontFamily(fontCssFamily(font)).run();
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setCategory("all");
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Typeface" className="text-ink-muted">
              <Type />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Typeface</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[min(calc(100vw-2rem),20rem)] p-2" align="start">
        <p className="px-1 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase">Free typefaces</p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fonts"
          aria-label="Search fonts"
          className="h-9 bg-paper"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              category === "all" ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted",
            )}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {FONT_CATEGORIES.map((id) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-full px-2.5 py-1 text-xs",
                category === id ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted",
              )}
              onClick={() => setCategory(id)}
            >
              {FONT_CATEGORY_LABEL[id]}
            </button>
          ))}
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <button
            type="button"
            className="flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset"
            onClick={() => {
              editor.chain().focus().unsetFontFamily().run();
              setOpen(false);
            }}
          >
            Default
          </button>
          {fonts.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-sm text-ink-muted">No fonts match that search.</p>
          ) : (
            fonts.map((font) => (
              <FontRow
                key={`${font.category}-${font.family}`}
                font={font}
                active={current?.includes(font.family) ?? false}
                onPick={apply}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
