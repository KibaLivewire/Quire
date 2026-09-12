import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

const QuireHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-color") || element.style.backgroundColor || null,
        renderHTML: (attributes: { color?: string | null }) => {
          if (!attributes.color) return {};
          return {
            "data-color": attributes.color,
            style: `background-color: ${attributes.color}; color: var(--color-highlight-ink)`,
          };
        },
      },
    };
  },
});

function dataAttr(name: string, value: unknown, skip?: unknown) {
  if (value == null || value === "" || value === skip) return {};
  return { [name]: String(value) };
}

const QuireImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-href") || element.closest("a")?.getAttribute("href"),
        renderHTML: (attributes: { href?: string | null }) =>
          attributes.href ? { "data-href": attributes.href } : {},
      },
      fit: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-fit"),
        renderHTML: (attributes: { fit?: string | null }) => dataAttr("data-fit", attributes.fit),
      },
      size: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-size"),
        renderHTML: (attributes: { size?: string | null }) => dataAttr("data-size", attributes.size),
      },
      align: {
        default: "center",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes: { align?: string | null }) =>
          dataAttr("data-align", attributes.align, "center"),
      },
      wrap: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-wrap"),
        renderHTML: (attributes: { wrap?: string | null }) => dataAttr("data-wrap", attributes.wrap),
      },
    };
  },
  renderHTML({ HTMLAttributes }): DOMOutputSpec {
    const href = HTMLAttributes.href as string | undefined;
    const rest = { ...HTMLAttributes };
    delete rest.href;
    const img: DOMOutputSpec = ["img", mergeAttributes(this.options.HTMLAttributes, rest)];
    if (href) {
      return ["a", { href, target: "_blank", rel: "noopener noreferrer", class: "quire-image-link" }, img];
    }
    return img;
  },
});

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
    },
  }),
  TextStyleKit.configure({
    backgroundColor: false,
    lineHeight: false,
  }),
  QuireHighlight.configure({
    multicolor: true,
    HTMLAttributes: { class: "quire-mark" },
  }),
  QuireImage.configure({
    allowBase64: true,
    HTMLAttributes: { class: "quire-image" },
    resize: {
      enabled: true,
      alwaysPreserveAspectRatio: false,
      minWidth: 80,
      minHeight: 80,
    },
  }),
  Placeholder.configure({
    placeholder: "Start a page…",
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
];
