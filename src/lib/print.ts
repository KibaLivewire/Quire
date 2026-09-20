export type PrintJob = {
  title: string;
  pages: string[];
  landscape: boolean;
  paper?: string;
  ink?: string;
  inkSaver?: boolean;
  grayscaleImages?: boolean;
  header?: boolean;
  pageNumbers?: boolean;
};

const PRINT_CSS = `
  @page { size: letter {{orient}}; margin: 0.7in 0.55in 0.75in; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: {{paper}};
    color: {{ink}};
    font-family: "Source Sans 3", "Segoe UI", Georgia, serif;
    font-size: 12pt;
    line-height: 1.5;
  }
  .sheet {
    background: {{paper}};
    color: {{ink}};
    page-break-after: always;
    break-after: page;
    position: relative;
    min-height: 9.2in;
  }
  .sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .running {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.72;
    margin: 0 0 0.85em;
    border-bottom: 1px solid color-mix(in srgb, {{ink}} 22%, {{paper}});
    padding-bottom: 0.35em;
  }
  .folio {
    text-align: right;
    font-size: 9pt;
    opacity: 0.7;
    margin-top: 1.1em;
  }
  h1.title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22pt;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin: 0 0 0.6em;
    color: {{ink}};
  }
  p { margin: 0 0 0.7em; }
  h1, h2, h3 { margin: 0.9em 0 0.4em; line-height: 1.25; color: {{ink}}; }
  h1 { font-size: 18pt; }
  h2 { font-size: 14pt; }
  h3 { font-size: 12.5pt; }
  ul, ol { margin: 0.4em 0 0.8em; padding-left: 1.3em; }
  table { border-collapse: collapse; width: 100%; margin: 0.6em 0 1em; }
  th, td { border: 1px solid color-mix(in srgb, {{ink}} 28%, {{paper}}); padding: 0.25em 0.4em; }
  blockquote {
    margin: 0.8em 0;
    padding-left: 0.9em;
    border-left: 2px solid color-mix(in srgb, {{ink}} 35%, {{paper}});
    color: {{ink}};
    font-style: italic;
  }
  img { max-width: 100%; height: auto; {{imgFilter}} }
  mark { background: #f3e2a0; color: #1c1917; padding: 0 0.12em; }
  .quire-note { border-bottom: 1px dotted currentColor; }
  .quire-note[data-note]::after { content: " [" attr(data-note) "]"; font-size: 0.85em; opacity: 0.8; }
  .quire-bookmark { border-bottom: 0.12em solid currentColor; }
  a { color: inherit; text-decoration: underline; }
  hr { border: 0; border-top: 1px solid color-mix(in srgb, {{ink}} 22%, {{paper}}); margin: 1.2em 0; }
  figure { margin: 0.6em 0; }
`;

export function printPaper(job: Pick<PrintJob, "inkSaver" | "paper">) {
  return job.inkSaver ? "#ffffff" : job.paper || "#ffffff";
}

export function printInk(job: Pick<PrintJob, "inkSaver" | "ink">) {
  return job.inkSaver ? "#1c1917" : job.ink || "#1c1917";
}

export function buildPrintDocument(job: PrintJob): string {
  const paper = printPaper(job);
  const ink = printInk(job);
  const sheets = job.pages
    .map((html, index) => {
      const title =
        index === 0 && job.title.trim()
          ? `<h1 class="title">${escapeHtml(job.title.trim())}</h1>`
          : "";
      const running =
        job.header !== false
          ? `<div class="running"><span>${escapeHtml(job.title.trim() || "Untitled")}</span><span>Quire</span></div>`
          : "";
      const folio =
        job.pageNumbers !== false
          ? `<div class="folio">${index + 1} / ${job.pages.length}</div>`
          : "";
      return `<section class="sheet">${running}${title}${html || "<p></p>"}${folio}</section>`;
    })
    .join("");
  const css = PRINT_CSS.replace("{{orient}}", job.landscape ? "landscape" : "portrait")
    .replaceAll("{{paper}}", paper)
    .replaceAll("{{ink}}", ink)
    .replace("{{imgFilter}}", job.grayscaleImages ? "filter: grayscale(1);" : "");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(job.title || "Untitled")}</title><style>${css}</style></head><body>${sheets}</body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

export function printDocument(job: PrintJob): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      reject(new Error("Could not open the printer."));
      return;
    }
    doc.open();
    doc.write(buildPrintDocument(job));
    doc.close();

    const printWin = win;
    const printDoc = doc;

    function cleanup() {
      printWin.removeEventListener("afterprint", cleanup);
      frame.remove();
      resolve();
    }

    function go() {
      printWin.addEventListener("afterprint", cleanup);
      printWin.focus();
      printWin.print();
      setTimeout(cleanup, 60_000);
    }

    const images = Array.from(printDoc.images);
    if (!images.length) {
      setTimeout(go, 50);
      return;
    }
    Promise.all(
      images.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((done) => {
                img.addEventListener("load", () => done(), { once: true });
                img.addEventListener("error", () => done(), { once: true });
              }),
      ),
    ).then(() => setTimeout(go, 50));
  });
}

type OpenPrint = () => void;
let opener: OpenPrint | null = null;

export function registerPrintPreview(handler: OpenPrint) {
  opener = handler;
  return () => {
    if (opener === handler) opener = null;
  };
}

export function openPrintPreview() {
  opener?.();
}
