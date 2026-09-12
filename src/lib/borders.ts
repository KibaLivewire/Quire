import type { BorderId } from "./types";

export const BORDER_META: { id: BorderId; label: string; hint: string }[] = [
  { id: "none", label: "Bare", hint: "No frame" },
  { id: "hairline", label: "Hairline", hint: "A single thin rule" },
  { id: "double", label: "Double", hint: "Two nested rules" },
  { id: "folio", label: "Folio", hint: "A bookish inner plate" },
  { id: "gilt", label: "Gilt", hint: "A warm metal edge" },
  { id: "stitch", label: "Stitch", hint: "Saddle-stitched margin" },
  { id: "vine", label: "Vine", hint: "Corner flourishes" },
  { id: "deckle", label: "Deckle", hint: "Soft paper edge" },
  { id: "manuscript", label: "Manuscript", hint: "A left-hand rule" },
  { id: "mat", label: "Mat", hint: "A wide gallery mat" },
];
