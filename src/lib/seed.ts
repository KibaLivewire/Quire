import type { Note, Notebook } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-12T12:00:00.000Z");

function daysAgo(days: number, hours = 0): number {
  return NOW - days * DAY - hours * 60 * 60 * 1000;
}

function note(partial: Omit<Note, "pages" | "content" | "color"> & { content: string; color?: string | null }): Note {
  return { ...partial, pages: [partial.content], color: partial.color ?? null };
}

export const SEED_NOTEBOOKS: Notebook[] = [
  { id: "nb_personal", name: "Personal", hue: "forest", parentId: null, color: "#3d6b4f", createdAt: daysAgo(14) },
  { id: "nb_letters", name: "Letters", hue: "wine", parentId: "nb_personal", color: "#8a3d45", createdAt: daysAgo(12) },
  { id: "nb_reading", name: "Reading", hue: "umber", parentId: null, color: "#8a5a32", createdAt: daysAgo(10) },
  { id: "nb_work", name: "Work", hue: "slate", parentId: null, color: "#4f6f8f", createdAt: daysAgo(8) },
];

export const SEED_NOTES: Note[] = [
  note({
    id: "note_welcome",
    notebookId: "nb_personal",
    title: "Welcome to Quire",
    pinned: true,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(0, 2),
    content: `
<p>A quiet notebook for sentences that want a desk, not a feed. Pages live on this device — nothing is sent away.</p>
<img src="/welcome-desk.jpg" alt="An open blank journal and a quill standing in an inkpot on a cedar table">
<p>Write with <strong>weight</strong>, <em>emphasis</em>, <u>underline</u>, or a <mark data-color="#f3e2a0" style="background-color: #f3e2a0; color: #1c1917">highlight</mark>. Change the typeface from the bar above. Drop in a photograph with the image button, or paste one straight from the clipboard.</p>
<blockquote><p>Fill the page the way you would a paper one. Nobody is watching.</p></blockquote>
<ul>
<li><p>Start a notebook for each corner of your life</p></li>
<li><p>Pin the pages you return to</p></li>
<li><p>Search when the pile grows</p></li>
</ul>
<p>When a sheet fills, the next one appears. Choose a theme, a border, a zoom. The rest is ink.</p>
`.trim(),
  }),
  note({
    id: "note_september",
    notebookId: "nb_personal",
    title: "A September morning",
    pinned: false,
    createdAt: daysAgo(1, 5),
    updatedAt: daysAgo(0, 6),
    content: `
<p>The window was open before the heat arrived. Coffee gone lukewarm. A jay arguing with the maple.</p>
<p>I wrote three lines that were no good and one that was. That is the usual ratio, and I have made peace with it.</p>
<h2>What I want from the week</h2>
<ul>
<li><p>Walk without the phone, twice</p></li>
<li><p>Finish the letter to M.</p></li>
<li><p>Read in the chair, not in bed</p></li>
</ul>
<p>The maple is already thinking about yellow. I am trying to notice that before it becomes a photograph of noticing.</p>
`.trim(),
  }),
  note({
    id: "note_keeping",
    notebookId: "nb_reading",
    title: "Why keep a notebook",
    pinned: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1, 2),
    content: `
<p>A notebook is not a diary unless you need it to be. It is a pocket where a sentence can wait until it is ready to be true.</p>
<p>I copy down phrases I do not yet understand. Weeks later they have arranged themselves. The page does the work I was too impatient to do.</p>
<blockquote><p>Keep the scraps. The scraps remember what the polished paragraph forgets.</p></blockquote>
<p>When I reread old pages I am not looking for wisdom. I am checking whether I was paying attention.</p>
`.trim(),
  }),
  note({
    id: "note_letter",
    notebookId: "nb_letters",
    title: "A letter I have not sent",
    pinned: false,
    color: "#8a3d45",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(2),
    content: `
<p>I keep this in a folder inside Personal, the way a paper letter waits in a drawer.</p>
<p>The folding is the point. Some sentences need a smaller room.</p>
`.trim(),
  }),
];

export function createSeed() {
  return {
    notebooks: SEED_NOTEBOOKS,
    notes: SEED_NOTES,
    activeNotebookId: "nb_personal",
    activeNoteId: "note_welcome",
  };
}
