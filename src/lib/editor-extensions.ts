import { Extension, getRenderedAttributes, mergeAttributes, ResizableNodeView } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
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
  atom: true,
  selectable: true,
  draggable: false,
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
      ox: {
        default: 0,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute("data-ox") || 0) || 0,
        renderHTML: (attributes: { ox?: number | null }) => dataAttr("data-ox", attributes.ox || 0, 0),
      },
      oy: {
        default: 0,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute("data-oy") || 0) || 0,
        renderHTML: (attributes: { oy?: number | null }) => dataAttr("data-oy", attributes.oy || 0, 0),
      },
      watermark: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-watermark"),
        renderHTML: (attributes: { watermark?: string | null }) =>
          dataAttr("data-watermark", attributes.watermark),
      },
      editStyle: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-edit-style"),
        renderHTML: (attributes: { editStyle?: string | null }) =>
          attributes.editStyle ? { "data-edit-style": attributes.editStyle } : {},
      },
    };
  },
  renderHTML({ HTMLAttributes }): DOMOutputSpec {
    const href = HTMLAttributes.href as string | undefined;
    const rest = { ...HTMLAttributes };
    delete rest.href;
    const mark = String(rest.watermark || rest["data-watermark"] || "");
    const ox = Number(rest.ox || rest["data-ox"] || 0);
    const oy = Number(rest.oy || rest["data-oy"] || 0);
    const edit = String(rest.editStyle || rest["data-edit-style"] || "");
    const style = [
      ox || oy ? `position:relative;left:${ox}px;top:${oy}px` : "",
      edit,
    ]
      .filter(Boolean)
      .join(";");
    if (style) rest.style = `${rest.style ? `${String(rest.style)};` : ""}${style}`;
    const img: DOMOutputSpec = ["img", mergeAttributes(this.options.HTMLAttributes, rest)];
    const inner: DOMOutputSpec = mark
      ? ["span", { class: "quire-figure" }, img, ["span", { class: "quire-watermark" }, mark]]
      : img;
    if (href) {
      return ["a", { href, target: "_blank", rel: "noopener noreferrer", class: "quire-image-link" }, inner];
    }
    return inner;
  },
  addNodeView() {
    const name = this.name;
    const editor = this.editor;
    const htmlAttrs = this.options.HTMLAttributes;
    const resize = this.options.resize;
    if (!resize || !resize.enabled || typeof document === "undefined") {
      return null;
    }
    const { minWidth, minHeight, alwaysPreserveAspectRatio } = resize;

    return ({ node, getPos, HTMLAttributes }) => {
      const figure = document.createElement("span");
      figure.className = "quire-figure";
      const img = document.createElement("img");
      img.className = "quire-image";
      img.draggable = false;
      const mark = document.createElement("span");
      mark.className = "quire-watermark";
      figure.append(img, mark);

      const applyAttrs = (attrs: Record<string, unknown>, box?: HTMLElement) => {
        Object.entries(mergeAttributes(htmlAttrs, attrs)).forEach(([key, value]) => {
          if (key === "src" || key === "width" || key === "height" || key === "style" || value == null) return;
          img.setAttribute(key, String(value));
        });
        const src = attrs.src;
        if (typeof src === "string" && src) img.src = src;
        const text = String(attrs.watermark ?? attrs["data-watermark"] ?? "");
        mark.textContent = text;
        mark.hidden = !text;
        figure.classList.toggle("has-watermark", Boolean(text));
        img.style.filter = "";
        img.style.transform = "";
        const edit = String(attrs.editStyle ?? attrs["data-edit-style"] ?? "");
        if (edit) {
          edit.split(";").forEach((part) => {
            const [prop, ...rest] = part.split(":");
            if (!prop || !rest.length) return;
            img.style.setProperty(prop.trim(), rest.join(":").trim());
          });
        }
        if (attrs.width) {
          figure.style.width = `${attrs.width}px`;
          img.style.width = "100%";
          img.style.height = "auto";
        }
        if (box) {
          const ox = Number(attrs.ox || attrs["data-ox"] || 0);
          const oy = Number(attrs.oy || attrs["data-oy"] || 0);
          box.style.position = "relative";
          box.style.left = `${ox}px`;
          box.style.top = `${oy}px`;
        }
      };

      applyAttrs(HTMLAttributes);

      const nodeView = new ResizableNodeView({
        element: figure,
        editor,
        node,
        getPos,
        onResize: (width) => {
          figure.style.width = `${width}px`;
          img.style.width = "100%";
          img.style.height = "auto";
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          editor.chain().setNodeSelection(pos).updateAttributes(name, { width, height, size: null, fit: null }).run();
        },
        onUpdate: (updated) => {
          if (updated.type.name !== name) return false;
          const extensionAttributes = editor.extensionManager.attributes.filter(
            (attribute) => attribute.type === updated.type.name,
          );
          applyAttrs({ ...updated.attrs, ...getRenderedAttributes(updated, extensionAttributes) }, nodeView.dom);
          return true;
        },
        options: {
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          min: { width: minWidth ?? 64, height: minHeight ?? 64 },
          preserveAspectRatio: alwaysPreserveAspectRatio ?? true,
          className: {
            container: "quire-image-box",
            wrapper: "quire-image-wrap",
            handle: "quire-resize-handle",
          },
        },
      });

      const box = nodeView.dom as HTMLElement;
      applyAttrs(HTMLAttributes, box);

      let drag: { x: number; y: number; ox: number; oy: number; moved: boolean } | null = null;

      function selectSelf() {
        const pos = getPos();
        if (pos === undefined) return;
        editor.chain().setNodeSelection(pos).run();
      }

      function onDown(event: PointerEvent) {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("[data-resize-handle], .quire-resize-handle")) return;
        selectSelf();
        const pos = getPos();
        const attrs = pos !== undefined ? editor.state.doc.nodeAt(pos)?.attrs : null;
        drag = {
          x: event.clientX,
          y: event.clientY,
          ox: Number(attrs?.ox || 0),
          oy: Number(attrs?.oy || 0),
          moved: false,
        };
      }

      function onMove(event: PointerEvent) {
        if (!drag) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && dx * dx + dy * dy < 36) return;
        drag.moved = true;
        event.preventDefault();
        box.style.position = "relative";
        box.style.left = `${drag.ox + dx}px`;
        box.style.top = `${drag.oy + dy}px`;
        box.classList.add("is-dragging");
      }

      function onUp(event: PointerEvent) {
        if (!drag) return;
        if (drag.moved) {
          const ox = Math.round(drag.ox + event.clientX - drag.x);
          const oy = Math.round(drag.oy + event.clientY - drag.y);
          const pos = getPos();
          if (pos !== undefined) {
            editor.chain().setNodeSelection(pos).updateAttributes(name, { ox, oy }).run();
          }
        }
        box.classList.remove("is-dragging");
        drag = null;
      }

      box.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      const originalDestroy = nodeView.destroy.bind(nodeView);
      Object.assign(nodeView, {
        stopEvent(event: Event) {
          const type = event.type;
          const target = event.target as HTMLElement | null;
          if (target?.closest?.("[data-resize-handle], .quire-resize-handle")) return true;
          if (type === "mousedown" || type === "pointerdown" || type === "touchstart") return true;
          if (drag?.moved && (type === "mousemove" || type === "pointermove")) return true;
          return false;
        },
        ignoreMutation: () => true,
        destroy() {
          box.removeEventListener("pointerdown", onDown);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          originalDestroy();
        },
      });

      return nodeView;
    };
  },
});

const BlockTune = Extension.create({
  name: "blockTune",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => Number(element.getAttribute("data-indent") || 0) || 0,
            renderHTML: (attributes) =>
              attributes.indent ? { "data-indent": String(attributes.indent) } : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-lh"),
            renderHTML: (attributes) =>
              attributes.lineHeight ? { "data-lh": String(attributes.lineHeight) } : {},
          },
          paraSpace: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-ps"),
            renderHTML: (attributes) =>
              attributes.paraSpace ? { "data-ps": String(attributes.paraSpace) } : {},
          },
        },
      },
    ];
  },
});

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        class: "quire-link",
      },
    },
  }),
  TextStyleKit.configure({
    backgroundColor: false,
    lineHeight: false,
  }),
  BlockTune,
  QuireHighlight.configure({
    multicolor: true,
    HTMLAttributes: { class: "quire-mark" },
  }),
  QuireImage.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: { class: "quire-image" },
    resize: {
      enabled: true,
      alwaysPreserveAspectRatio: true,
      minWidth: 64,
      minHeight: 64,
    },
  }),
  Placeholder.configure({
    placeholder: "Start a page…",
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
];
