import { escapeHtml, plainText } from "./utils";

function safeName(title: string) {
  return title.replace(/[^\w\s-]+/g, "").trim() || "untitled";
}

function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHtml(title: string, content: string) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 12pt/1.6 Georgia, serif; color: #1c1917; max-width: 8.5in; margin: 0.75in auto; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${content}
</body>
</html>`;
  download(`${safeName(title)}.html`, html, "text/html");
}

export function exportText(title: string, content: string) {
  download(`${safeName(title)}.txt`, `${title}\n\n${plainText(content)}\n`, "text/plain");
}

export function exportMarkdown(title: string, content: string) {
  const md = htmlToMarkdown(content);
  download(`${safeName(title)}.md`, `# ${title}\n\n${md}\n`, "text/markdown");
}

function htmlToMarkdown(html: string): string {
  const node = document.createElement("div");
  node.innerHTML = html;
  return walk(node).replace(/\n{3,}/g, "\n\n").trim();
}

function walk(el: Node): string {
  if (el.nodeType === Node.TEXT_NODE) return el.textContent ?? "";
  if (!(el instanceof HTMLElement)) {
    return Array.from(el.childNodes).map(walk).join("");
  }
  const inner = Array.from(el.childNodes).map(walk).join("");
  const tag = el.tagName.toLowerCase();
  if (tag === "h1") return `\n# ${inner}\n\n`;
  if (tag === "h2") return `\n## ${inner}\n\n`;
  if (tag === "h3") return `\n### ${inner}\n\n`;
  if (tag === "p") return `${inner}\n\n`;
  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") return `**${inner}**`;
  if (tag === "em" || tag === "i") return `*${inner}*`;
  if (tag === "blockquote") return `\n> ${inner.trim()}\n\n`;
  if (tag === "li") return `- ${inner.trim()}\n`;
  if (tag === "img") {
    const src = el.getAttribute("src") || "";
    const alt = el.getAttribute("alt") || "image";
    return src.startsWith("data:") ? `![${alt}](embedded-image)\n\n` : `![${alt}](${src})\n\n`;
  }
  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    return href ? `[${inner}](${href})` : inner;
  }
  return inner;
}
