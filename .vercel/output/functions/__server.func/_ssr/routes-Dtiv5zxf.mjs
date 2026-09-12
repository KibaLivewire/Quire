import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime, a as Overlay2, c as Title2, d as DialogContent$1, f as DialogDescription$1, h as DialogTitle$1, i as Description2, j as Slot, l as Dialog$1, m as DialogPortal$1, n as Cancel, o as Portal2, p as DialogOverlay$1, r as Content2, s as Root2, t as Action, u as DialogClose } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as Copy, C as Heading3, D as Ellipsis, E as FolderInput, F as ArrowLeft, I as AlignLeft, L as AlignRight, M as ChevronLeft, N as BookOpen, O as Download, P as Bold, R as AlignCenter, S as Highlighter, T as Heading1, _ as List, a as Trash2, b as Italic, c as Settings, d as Plus, f as Pin, g as Maximize2, h as Menu, j as ChevronRight, k as Crop, l as Search, m as Minimize2, n as Underline, o as Strikethrough, p as Minus, r as Type, s as SquareCheckBig, t as X, u as Quote, v as ListOrdered, w as Heading2, x as ImagePlus, y as Link2 } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { t as formatDistanceToNow } from "../_libs/date-fns.mjs";
import { G as DOMSerializer, k as mergeAttributes } from "../_libs/@tiptap/core+[...].mjs";
import { n as useEditor, r as useEditorState, t as EditorContent } from "../_libs/fast-equals+tiptap__react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as Separator2, c as SubTrigger2, i as Root2$1, l as Trigger, n as Item2, o as Sub2, r as Portal2$1, s as SubContent2, t as Content2$1 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { i as Trigger$1, n as Portal, r as Root2$2, t as Content2$2 } from "../_libs/radix-ui__react-popover.mjs";
import { a as Trigger$2, i as Root3, n as Portal$1, r as Provider, t as Content2$3 } from "../_libs/@radix-ui/react-tooltip+[...].mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
import { t as Root$1 } from "../_libs/radix-ui__react-separator.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as src_default } from "../_libs/tiptap__extension-highlight.mjs";
import { t as src_default$1 } from "../_libs/tiptap__extension-image.mjs";
import { a as TaskItem, o as TaskList } from "../_libs/tiptap__extension-list.mjs";
import { t as src_default$2 } from "../_libs/@tiptap/extension-placeholder+[...].mjs";
import { t as src_default$3 } from "../_libs/tiptap__extension-text-align.mjs";
import { t as TextStyleKit } from "../_libs/tiptap__extension-text-style.mjs";
import { t as src_default$4 } from "../_libs/tiptap__starter-kit.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
import { t as Drawer } from "../_libs/vaul.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Dtiv5zxf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var AMP = "&";
function plainText(html) {
	return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<img[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(new RegExp(`${AMP}nbsp;`, "gi"), " ").replace(new RegExp(`${AMP}amp;`, "gi"), AMP).replace(new RegExp(`${AMP}lt;`, "gi"), "<").replace(new RegExp(`${AMP}gt;`, "gi"), ">").replace(new RegExp(`${AMP}quot;`, "gi"), "\"").replace(new RegExp(`${AMP}#39;`, "gi"), "'").replace(/\s+/g, " ").trim();
}
function wordCount(html) {
	const text = plainText(html);
	if (!text) return 0;
	return text.split(/\s+/).length;
}
function debounce(fn, ms) {
	let timer;
	let lastArgs;
	function wrapped(...args) {
		lastArgs = args;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = void 0;
			fn(...args);
		}, ms);
	}
	wrapped.cancel = () => {
		if (timer) clearTimeout(timer);
		timer = void 0;
	};
	wrapped.flush = () => {
		if (!timer || !lastArgs) return;
		clearTimeout(timer);
		timer = void 0;
		fn(...lastArgs);
	};
	return wrapped;
}
function escapeHtml(value) {
	return value.replaceAll(AMP, `${AMP}amp;`).replaceAll("<", `${AMP}lt;`).replaceAll(">", `${AMP}gt;`).replaceAll("\"", `${AMP}quot;`);
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			default: "bg-forest text-forest-fg hover:bg-forest/90",
			secondary: "bg-paper-inset text-ink hover:bg-rule",
			outline: "border border-rule bg-paper-raised text-ink hover:bg-paper-inset",
			ghost: "text-ink hover:bg-paper-inset",
			inverse: "text-cream/80 hover:bg-leather-hover hover:text-cream",
			destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
			link: "text-forest underline-offset-4 hover:underline"
		},
		size: {
			default: "h-10 px-4",
			sm: "h-9 px-3 text-sm",
			lg: "h-11 px-5",
			icon: "size-10",
			"icon-sm": "size-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
function Input({ className, type, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		suppressHydrationWarning: true,
		className: cn("flex h-10 w-full rounded-md border border-rule bg-paper-raised px-3 text-sm text-ink", "placeholder:text-ink-subtle", "transition-[border-color,box-shadow] duration-150 ease-out", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", "disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	});
}
function Popover({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2$2, { ...props });
}
function PopoverTrigger({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger$1, { ...props });
}
function PopoverContent({ className, align = "start", sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$2, {
		align,
		sideOffset,
		className: cn("z-50 w-56 rounded-xl border border-rule bg-paper-raised p-2 text-ink shadow-[var(--shadow-lift)] outline-none", "origin-[var(--radix-popover-content-transform-origin)]", "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className),
		...props
	}) });
}
function TooltipProvider({ delayDuration = 400, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Provider, {
		delayDuration,
		...props
	});
}
function Tooltip({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root3, { ...props });
}
function TooltipTrigger({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger$2, { ...props });
}
function TooltipContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal$1, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$3, {
		sideOffset,
		className: cn("z-50 overflow-hidden rounded-md bg-leather px-2 py-1.5 text-xs text-cream shadow-[var(--shadow-lift)]", "origin-[var(--radix-tooltip-content-transform-origin)]", "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className),
		...props
	}) });
}
var FONT_CATEGORIES = [
	"serif",
	"sans",
	"display",
	"handwriting",
	"mono"
];
var FONT_CATEGORY_LABEL = {
	serif: "Serif",
	sans: "Sans",
	display: "Display",
	handwriting: "Script",
	mono: "Mono"
};
var FONT_CATEGORY_FALLBACK = {
	serif: "Georgia, serif",
	sans: "system-ui, sans-serif",
	display: "Georgia, serif",
	handwriting: "cursive",
	mono: "ui-monospace, monospace"
};
/** Curated free families from Google Fonts, searchable by name and category. */
var WEB_FONTS = [
	{
		family: "Newsreader",
		category: "serif"
	},
	{
		family: "Lora",
		category: "serif"
	},
	{
		family: "Source Serif 4",
		category: "serif"
	},
	{
		family: "Merriweather",
		category: "serif"
	},
	{
		family: "Playfair Display",
		category: "serif"
	},
	{
		family: "EB Garamond",
		category: "serif"
	},
	{
		family: "Libre Baskerville",
		category: "serif"
	},
	{
		family: "PT Serif",
		category: "serif"
	},
	{
		family: "Noto Serif",
		category: "serif"
	},
	{
		family: "Crimson Text",
		category: "serif"
	},
	{
		family: "Spectral",
		category: "serif"
	},
	{
		family: "Cormorant Garamond",
		category: "serif"
	},
	{
		family: "Cardo",
		category: "serif"
	},
	{
		family: "Bitter",
		category: "serif"
	},
	{
		family: "Roboto Serif",
		category: "serif"
	},
	{
		family: "Fraunces",
		category: "serif"
	},
	{
		family: "Literata",
		category: "serif"
	},
	{
		family: "IBM Plex Serif",
		category: "serif"
	},
	{
		family: "Zilla Slab",
		category: "serif"
	},
	{
		family: "Domine",
		category: "serif"
	},
	{
		family: "Alegreya",
		category: "serif"
	},
	{
		family: "Vollkorn",
		category: "serif"
	},
	{
		family: "Old Standard TT",
		category: "serif"
	},
	{
		family: "Unna",
		category: "serif"
	},
	{
		family: "Oranienbaum",
		category: "serif"
	},
	{
		family: "Instrument Serif",
		category: "serif"
	},
	{
		family: "Young Serif",
		category: "serif"
	},
	{
		family: "Libre Caslon Text",
		category: "serif"
	},
	{
		family: "Tinos",
		category: "serif"
	},
	{
		family: "Arvo",
		category: "serif"
	},
	{
		family: "Rokkitt",
		category: "serif"
	},
	{
		family: "Crete Round",
		category: "serif"
	},
	{
		family: "Josefin Slab",
		category: "serif"
	},
	{
		family: "Faustina",
		category: "serif"
	},
	{
		family: "Gelasio",
		category: "serif"
	},
	{
		family: "Lusitana",
		category: "serif"
	},
	{
		family: "Amiri",
		category: "serif"
	},
	{
		family: "Noto Serif Display",
		category: "serif"
	},
	{
		family: "Source Sans 3",
		category: "sans"
	},
	{
		family: "Inter",
		category: "sans"
	},
	{
		family: "IBM Plex Sans",
		category: "sans"
	},
	{
		family: "Open Sans",
		category: "sans"
	},
	{
		family: "Roboto",
		category: "sans"
	},
	{
		family: "Work Sans",
		category: "sans"
	},
	{
		family: "Nunito Sans",
		category: "sans"
	},
	{
		family: "Nunito",
		category: "sans"
	},
	{
		family: "Lato",
		category: "sans"
	},
	{
		family: "Montserrat",
		category: "sans"
	},
	{
		family: "Poppins",
		category: "sans"
	},
	{
		family: "Raleway",
		category: "sans"
	},
	{
		family: "DM Sans",
		category: "sans"
	},
	{
		family: "Outfit",
		category: "sans"
	},
	{
		family: "Figtree",
		category: "sans"
	},
	{
		family: "Karla",
		category: "sans"
	},
	{
		family: "Manrope",
		category: "sans"
	},
	{
		family: "Urbanist",
		category: "sans"
	},
	{
		family: "Plus Jakarta Sans",
		category: "sans"
	},
	{
		family: "Space Grotesk",
		category: "sans"
	},
	{
		family: "Public Sans",
		category: "sans"
	},
	{
		family: "Libre Franklin",
		category: "sans"
	},
	{
		family: "Mulish",
		category: "sans"
	},
	{
		family: "Rubik",
		category: "sans"
	},
	{
		family: "Albert Sans",
		category: "sans"
	},
	{
		family: "Atkinson Hyperlegible",
		category: "sans"
	},
	{
		family: "PT Sans",
		category: "sans"
	},
	{
		family: "Noto Sans",
		category: "sans"
	},
	{
		family: "Cabin",
		category: "sans"
	},
	{
		family: "Barlow",
		category: "sans"
	},
	{
		family: "Josefin Sans",
		category: "sans"
	},
	{
		family: "Questrial",
		category: "sans"
	},
	{
		family: "Archivo",
		category: "sans"
	},
	{
		family: "Red Hat Display",
		category: "sans"
	},
	{
		family: "Schibsted Grotesk",
		category: "sans"
	},
	{
		family: "Instrument Sans",
		category: "sans"
	},
	{
		family: "Be Vietnam Pro",
		category: "sans"
	},
	{
		family: "Lexend",
		category: "sans"
	},
	{
		family: "Cinzel",
		category: "display"
	},
	{
		family: "Abril Fatface",
		category: "display"
	},
	{
		family: "Bebas Neue",
		category: "display"
	},
	{
		family: "Anton",
		category: "display"
	},
	{
		family: "Oswald",
		category: "display"
	},
	{
		family: "Righteous",
		category: "display"
	},
	{
		family: "Fredoka",
		category: "display"
	},
	{
		family: "Comfortaa",
		category: "display"
	},
	{
		family: "Alfa Slab One",
		category: "display"
	},
	{
		family: "Unbounded",
		category: "display"
	},
	{
		family: "Syne",
		category: "display"
	},
	{
		family: "Staatliches",
		category: "display"
	},
	{
		family: "Yeseva One",
		category: "display"
	},
	{
		family: "Prata",
		category: "display"
	},
	{
		family: "Bodoni Moda",
		category: "display"
	},
	{
		family: "Cinzel Decorative",
		category: "display"
	},
	{
		family: "Poiret One",
		category: "display"
	},
	{
		family: "Limelight",
		category: "display"
	},
	{
		family: "Ultra",
		category: "display"
	},
	{
		family: "Big Shoulders Display",
		category: "display"
	},
	{
		family: "Bungee",
		category: "display"
	},
	{
		family: "Passion One",
		category: "display"
	},
	{
		family: "Rye",
		category: "display"
	},
	{
		family: "UnifrakturMaguntia",
		category: "display"
	},
	{
		family: "Caveat",
		category: "handwriting"
	},
	{
		family: "Dancing Script",
		category: "handwriting"
	},
	{
		family: "Great Vibes",
		category: "handwriting"
	},
	{
		family: "Pacifico",
		category: "handwriting"
	},
	{
		family: "Satisfy",
		category: "handwriting"
	},
	{
		family: "Sacramento",
		category: "handwriting"
	},
	{
		family: "Indie Flower",
		category: "handwriting"
	},
	{
		family: "Patrick Hand",
		category: "handwriting"
	},
	{
		family: "Shadows Into Light",
		category: "handwriting"
	},
	{
		family: "Homemade Apple",
		category: "handwriting"
	},
	{
		family: "Alex Brush",
		category: "handwriting"
	},
	{
		family: "Allura",
		category: "handwriting"
	},
	{
		family: "Amatic SC",
		category: "handwriting"
	},
	{
		family: "Architects Daughter",
		category: "handwriting"
	},
	{
		family: "Kalam",
		category: "handwriting"
	},
	{
		family: "Handlee",
		category: "handwriting"
	},
	{
		family: "Covered By Your Grace",
		category: "handwriting"
	},
	{
		family: "Nothing You Could Do",
		category: "handwriting"
	},
	{
		family: "Marck Script",
		category: "handwriting"
	},
	{
		family: "Pinyon Script",
		category: "handwriting"
	},
	{
		family: "Tangerine",
		category: "handwriting"
	},
	{
		family: "Parisienne",
		category: "handwriting"
	},
	{
		family: "La Belle Aurore",
		category: "handwriting"
	},
	{
		family: "Special Elite",
		category: "handwriting"
	},
	{
		family: "Gochi Hand",
		category: "handwriting"
	},
	{
		family: "IBM Plex Mono",
		category: "mono"
	},
	{
		family: "Source Code Pro",
		category: "mono"
	},
	{
		family: "JetBrains Mono",
		category: "mono"
	},
	{
		family: "Fira Code",
		category: "mono"
	},
	{
		family: "Roboto Mono",
		category: "mono"
	},
	{
		family: "Space Mono",
		category: "mono"
	},
	{
		family: "Inconsolata",
		category: "mono"
	},
	{
		family: "Ubuntu Mono",
		category: "mono"
	},
	{
		family: "Anonymous Pro",
		category: "mono"
	},
	{
		family: "Cutive Mono",
		category: "mono"
	},
	{
		family: "DM Mono",
		category: "mono"
	},
	{
		family: "Overpass Mono",
		category: "mono"
	},
	{
		family: "PT Mono",
		category: "mono"
	},
	{
		family: "Noto Sans Mono",
		category: "mono"
	},
	{
		family: "Courier Prime",
		category: "mono"
	},
	{
		family: "Share Tech Mono",
		category: "mono"
	},
	{
		family: "VT323",
		category: "mono"
	},
	{
		family: "Red Hat Mono",
		category: "mono"
	},
	{
		family: "Azeret Mono",
		category: "mono"
	},
	{
		family: "Fragment Mono",
		category: "mono"
	},
	{
		family: "Spline Sans Mono",
		category: "mono"
	}
];
var loaded = /* @__PURE__ */ new Set();
function fontCssFamily(font) {
	return `"${font.family}", ${FONT_CATEGORY_FALLBACK[font.category]}`;
}
function loadGoogleFont(family) {
	if (typeof document === "undefined" || loaded.has(family)) return;
	loaded.add(family);
	const id = `gf-${family.replace(/\s+/g, "-").toLowerCase()}`;
	if (document.getElementById(id)) return;
	const link = document.createElement("link");
	link.id = id;
	link.rel = "stylesheet";
	link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&display=swap`;
	document.head.appendChild(link);
}
function filterFonts(query, category) {
	const q = query.trim().toLowerCase();
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const font of WEB_FONTS) {
		if (seen.has(font.family)) continue;
		if (category !== "all" && font.category !== category) continue;
		if (q && !font.family.toLowerCase().includes(q) && !font.category.includes(q)) continue;
		seen.add(font.family);
		out.push(font);
	}
	return out;
}
function FontRow({ font, active, onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: cn("flex w-full items-baseline justify-between rounded-md px-2.5 py-2 text-left hover:bg-paper-inset", active && "bg-paper-inset"),
		style: { fontFamily: fontCssFamily(font) },
		onMouseEnter: () => loadGoogleFont(font.family),
		onFocus: () => loadGoogleFont(font.family),
		onClick: () => onPick(font),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm",
			children: font.family
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-sans text-xs tracking-wide text-ink-subtle uppercase",
			children: FONT_CATEGORY_LABEL[font.category]
		})]
	});
}
function FontPicker({ editor, current }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("all");
	const fonts = (0, import_react.useMemo)(() => filterFonts(query, category), [query, category]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		fonts.slice(0, 12).forEach((font) => loadGoogleFont(font.family));
	}, [open, fonts]);
	function apply(font) {
		loadGoogleFont(font.family);
		editor.chain().focus().setFontFamily(fontCssFamily(font)).run();
		setOpen(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: (next) => {
			setOpen(next);
			if (!next) {
				setQuery("");
				setCategory("all");
			}
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "ghost",
					size: "icon-sm",
					"aria-label": "Typeface",
					className: "text-ink-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Type, {})
				})
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Typeface" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
			className: "w-[min(calc(100vw-2rem),20rem)] p-2",
			align: "start",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase",
					children: "Free typefaces"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: query,
					onChange: (e) => setQuery(e.target.value),
					placeholder: "Search fonts",
					"aria-label": "Search fonts",
					className: "h-9 bg-paper"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn("rounded-full px-2.5 py-1 text-xs", category === "all" ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted"),
						onClick: () => setCategory("all"),
						children: "All"
					}), FONT_CATEGORIES.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn("rounded-full px-2.5 py-1 text-xs", category === id ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted"),
						onClick: () => setCategory(id),
						children: FONT_CATEGORY_LABEL[id]
					}, id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 max-h-64 overflow-y-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset",
						onClick: () => {
							editor.chain().focus().unsetFontFamily().run();
							setOpen(false);
						},
						children: "Default"
					}), fonts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-2.5 py-6 text-center text-sm text-ink-muted",
						children: "No fonts match that search."
					}) : fonts.map((font) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FontRow, {
						font,
						active: current?.includes(font.family) ?? false,
						onPick: apply
					}, `${font.category}-${font.family}`))]
				})
			]
		})]
	});
}
function Dialog({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog$1, { ...props });
}
function DialogPortal({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogPortal$1, { ...props });
}
function DialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
		className: cn("fixed inset-0 z-50 bg-ink/40", "data-[state=open]:animate-in data-[state=open]:fade-in-0", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0", className),
		...props
	});
}
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed top-1/2 left-1/2 z-50 w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 -translate-y-1/2", "rounded-3xl bg-paper-raised p-4 text-ink shadow-[var(--shadow-lift)]", "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
			className: "absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-paper-inset hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			"aria-label": "Close",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
		})]
	})] });
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1.5 p-1 pb-3", className),
		...props
	});
}
function DialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col-reverse gap-2 p-1 pt-3 sm:flex-row sm:justify-end", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-display text-xl font-semibold tracking-tight text-ink", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-ink-muted", className),
		...props
	});
}
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		className: cn("text-sm font-medium text-ink", className),
		...props
	});
}
function Slider({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
		className: cn("relative flex w-full touch-none items-center select-none", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
			className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-paper-inset",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-forest" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-4 rounded-full border border-rule bg-paper-raised shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" })]
	});
}
var DEFAULT_ADJUST = {
	rotate: 0,
	flipH: false,
	flipV: false,
	brightness: 100,
	contrast: 100,
	saturate: 100,
	filter: "none",
	aspect: "free"
};
function loadHtmlImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error("Could not load that image."));
		img.src = src;
	});
}
function cropRect(width, height, aspect) {
	if (aspect === "free") return {
		x: 0,
		y: 0,
		w: width,
		h: height
	};
	const ratio = aspect === "square" ? 1 : aspect === "4:3" ? 4 / 3 : 16 / 9;
	let w = width;
	let h = w / ratio;
	if (h > height) {
		h = height;
		w = h * ratio;
	}
	return {
		x: (width - w) / 2,
		y: (height - h) / 2,
		w,
		h
	};
}
function cssFilter(adj) {
	const parts = [
		`brightness(${adj.brightness}%)`,
		`contrast(${adj.contrast}%)`,
		`saturate(${adj.saturate}%)`
	];
	if (adj.filter === "grayscale") parts.push("grayscale(1)");
	if (adj.filter === "sepia") parts.push("sepia(0.7)");
	if (adj.filter === "warm") parts.push("sepia(0.25)", "saturate(1.15)");
	if (adj.filter === "cool") parts.push("hue-rotate(190deg)", "saturate(0.85)");
	if (adj.filter === "contrast") parts.push("contrast(1.25)", "saturate(1.1)");
	return parts.join(" ");
}
async function renderEditedImage(src, adj) {
	const img = await loadHtmlImage(src);
	const crop = cropRect(img.naturalWidth, img.naturalHeight, adj.aspect);
	const rotated = adj.rotate === 90 || adj.rotate === 270;
	const outW = Math.max(1, Math.round(rotated ? crop.h : crop.w));
	const outH = Math.max(1, Math.round(rotated ? crop.w : crop.h));
	const canvas = document.createElement("canvas");
	canvas.width = outW;
	canvas.height = outH;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not edit that image.");
	ctx.filter = cssFilter(adj);
	ctx.translate(outW / 2, outH / 2);
	ctx.rotate(adj.rotate * Math.PI / 180);
	ctx.scale(adj.flipH ? -1 : 1, adj.flipV ? -1 : 1);
	ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, -crop.w / 2, -crop.h / 2, crop.w, crop.h);
	return /image\/png/i.test(src) || src.startsWith("data:image/png") ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", .9);
}
var FILTERS = [
	{
		id: "none",
		label: "Original"
	},
	{
		id: "grayscale",
		label: "Graphite"
	},
	{
		id: "sepia",
		label: "Sepia"
	},
	{
		id: "warm",
		label: "Warm"
	},
	{
		id: "cool",
		label: "Cool"
	},
	{
		id: "contrast",
		label: "Punch"
	}
];
var ASPECTS = [
	{
		id: "free",
		label: "Free"
	},
	{
		id: "square",
		label: "Square"
	},
	{
		id: "4:3",
		label: "4:3"
	},
	{
		id: "16:9",
		label: "16:9"
	}
];
function ImageEditor({ open, src, onOpenChange, onApply }) {
	const [adj, setAdj] = (0, import_react.useState)(DEFAULT_ADJUST);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (open) setAdj(DEFAULT_ADJUST);
	}, [open, src]);
	const previewFilter = (0, import_react.useMemo)(() => {
		const parts = [
			`brightness(${adj.brightness}%)`,
			`contrast(${adj.contrast}%)`,
			`saturate(${adj.saturate}%)`
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
			onApply(await renderEditedImage(src, adj));
			onOpenChange(false);
		} catch {
			toast.error("Could not save that edit.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "w-[min(calc(100%-1.5rem),36rem)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Edit image" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Crop, rotate, and tune a picture on this page." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-hidden rounded-2xl bg-paper-inset",
					children: src ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src,
						alt: "Image being edited",
						className: "mx-auto max-h-64 object-contain",
						style: {
							filter: previewFilter,
							transform: `rotate(${adj.rotate}deg) scale(${adj.flipH ? -1 : 1}, ${adj.flipV ? -1 : 1})`
						}
					}) : null
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 px-1 pt-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1.5",
							children: ASPECTS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: cn("rounded-full px-2.5 py-1 text-xs", adj.aspect === item.id ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted"),
								onClick: () => setAdj((prev) => ({
									...prev,
									aspect: item.id
								})),
								children: item.label
							}, item.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1.5",
							children: FILTERS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: cn("rounded-full px-2.5 py-1 text-xs", adj.filter === item.id ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted"),
								onClick: () => setAdj((prev) => ({
									...prev,
									filter: item.id
								})),
								children: item.label
							}, item.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setAdj((prev) => ({
										...prev,
										rotate: (prev.rotate + 270) % 360
									})),
									children: "Rotate left"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setAdj((prev) => ({
										...prev,
										rotate: (prev.rotate + 90) % 360
									})),
									children: "Rotate right"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setAdj((prev) => ({
										...prev,
										flipH: !prev.flipH
									})),
									children: "Flip"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setAdj((prev) => ({
										...prev,
										flipV: !prev.flipV
									})),
									children: "Flip vertical"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs text-ink-muted",
									children: "Brightness"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
									min: 40,
									max: 160,
									value: [adj.brightness],
									onValueChange: ([value]) => setAdj((prev) => ({
										...prev,
										brightness: value
									}))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs text-ink-muted",
									children: "Contrast"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
									min: 40,
									max: 160,
									value: [adj.contrast],
									onValueChange: ([value]) => setAdj((prev) => ({
										...prev,
										contrast: value
									}))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs text-ink-muted",
									children: "Color"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
									min: 0,
									max: 180,
									value: [adj.saturate],
									onValueChange: ([value]) => setAdj((prev) => ({
										...prev,
										saturate: value
									}))
								})] })
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => onOpenChange(false),
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => void apply(),
					disabled: busy,
					children: busy ? "Saving" : "Apply"
				})] })
			]
		})
	});
}
function takeWords(rows, max = 10) {
	if (!Array.isArray(rows)) return [];
	return rows.map((row) => row && typeof row === "object" && "word" in row ? String(row.word) : "").filter(Boolean).slice(0, max);
}
async function datamuse(params) {
	const res = await fetch(`https://api.datamuse.com/words?${params}`);
	if (!res.ok) return [];
	return res.json();
}
function selectedPlainWord(text) {
	return text.replace(/[^\p{L}\p{N}'’-]+/gu, " ").trim().split(/\s+/)[0] ?? "";
}
async function lookupWord(raw) {
	const word = selectedPlainWord(raw).toLowerCase();
	if (!word) return null;
	const [syn, ant, similar, phrases, defRes] = await Promise.all([
		datamuse(`rel_syn=${encodeURIComponent(word)}&max=12`),
		datamuse(`rel_ant=${encodeURIComponent(word)}&max=8`),
		datamuse(`ml=${encodeURIComponent(word)}&max=12`),
		datamuse(`rel_jja=${encodeURIComponent(word)}&max=8`),
		fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`).then((r) => r.ok ? r.json() : null).catch(() => null)
	]);
	let definition = "";
	try {
		const def = (defRes?.[0]?.meanings?.[0])?.definitions?.[0]?.definition;
		if (typeof def === "string") definition = def;
	} catch {
		definition = "";
	}
	return {
		word,
		definition,
		synonyms: takeWords(syn),
		antonyms: takeWords(ant),
		similar: takeWords(similar).filter((item) => item.toLowerCase() !== word),
		phrases: takeWords(phrases, 6)
	};
}
function webSearchUrl(query) {
	return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
}
function List$1({ title, items, onPick }) {
	if (!items.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-[10px] font-medium tracking-wide text-ink-subtle uppercase",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-1 flex flex-wrap gap-1",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "rounded-full bg-paper-inset px-2 py-0.5 text-xs text-ink hover:bg-rule",
			onClick: () => onPick?.(item),
			children: item
		}, item))
	})] });
}
function WordLookupCard({ sense, loading, onReplace }) {
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-1 py-2 text-sm text-ink-muted",
		children: "Looking that word up…"
	});
	if (!sense) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-1 py-2 text-sm text-ink-muted",
		children: "Select a word to see senses and kin."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3 px-1 py-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-lg font-semibold tracking-tight",
				children: sense.word
			}), sense.definition ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm leading-snug text-ink-muted",
				children: sense.definition
			}) : null] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List$1, {
				title: "Synonyms",
				items: sense.synonyms,
				onPick: onReplace
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List$1, {
				title: "Antonyms",
				items: sense.antonyms,
				onPick: onReplace
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List$1, {
				title: "Similar",
				items: sense.similar,
				onPick: onReplace
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List$1, {
				title: "Nearby phrases",
				items: sense.phrases
			})
		]
	});
}
async function fetchSense(word) {
	try {
		return await lookupWord(word);
	} catch {
		return null;
	}
}
function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root$1, {
		decorative,
		orientation,
		className: cn("shrink-0 bg-rule", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className),
		...props
	});
}
var FONT_SIZES = [
	{
		id: "sm",
		label: "Small",
		value: "0.95rem"
	},
	{
		id: "md",
		label: "Body",
		value: "1.125rem"
	},
	{
		id: "lg",
		label: "Large",
		value: "1.35rem"
	},
	{
		id: "xl",
		label: "Display",
		value: "1.75rem"
	}
];
var HIGHLIGHTS = [
	{
		id: "none",
		label: "None",
		swatch: "bg-paper-raised border border-rule"
	},
	{
		id: "butter",
		label: "Butter",
		color: "#f3e2a0",
		swatch: "bg-highlight-butter"
	},
	{
		id: "sage",
		label: "Sage",
		color: "#cfe0c3",
		swatch: "bg-highlight-sage"
	},
	{
		id: "blush",
		label: "Blush",
		color: "#f0cfc8",
		swatch: "bg-highlight-blush"
	},
	{
		id: "sky",
		label: "Sky",
		color: "#c9dcea",
		swatch: "bg-highlight-sky"
	}
];
var INK_COLORS = [
	{
		id: "ink",
		label: "Ink",
		color: "var(--color-ink)",
		swatch: "bg-ink"
	},
	{
		id: "muted",
		label: "Graphite",
		color: "var(--color-ink-muted)",
		swatch: "bg-ink-muted"
	},
	{
		id: "forest",
		label: "Accent",
		color: "var(--color-forest)",
		swatch: "bg-forest"
	},
	{
		id: "wine",
		label: "Wine",
		color: "#c45c4e",
		swatch: "bg-destructive"
	}
];
var MAX_EDGE = 1600;
var JPEG_QUALITY = .84;
var PASSTHROUGH_BYTES = 22e4;
var ALLOWED = /image\/(jpeg|jpg|png|gif|webp)/i;
var ALLOWED_EXT = /\.(jpe?g|png|gif|webp)$/i;
var IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";
function isAllowedImage(file) {
	if (ALLOWED.test(file.type)) return true;
	if (file.type && file.type !== "application/octet-stream") return false;
	return ALLOWED_EXT.test(file.name);
}
function readAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}
async function fileToDataUrl(file) {
	if (!isAllowedImage(file)) throw new Error("Use a JPEG, PNG, GIF, or WebP image.");
	const type = file.type || guessType(file.name);
	if (/gif/i.test(type) || /\.gif$/i.test(file.name)) return readAsDataUrl(file);
	if (file.size <= PASSTHROUGH_BYTES) return readAsDataUrl(file);
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		return readAsDataUrl(file);
	}
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	return /png/i.test(type) ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
function guessType(name) {
	if (/\.png$/i.test(name)) return "image/png";
	if (/\.gif$/i.test(name)) return "image/gif";
	if (/\.webp$/i.test(name)) return "image/webp";
	return "image/jpeg";
}
async function insertImages(editor, files) {
	const images = files.filter(isAllowedImage);
	if (!images.length) throw new Error("Use a JPEG, PNG, GIF, or WebP image.");
	for (const file of images) {
		const src = await fileToDataUrl(file);
		const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
		editor.chain().focus().setImage({
			src,
			alt
		}).run();
	}
}
function collectImageFiles(list) {
	if (!list) return [];
	return Array.from(list).filter(isAllowedImage);
}
function selectedImageSrc(editor) {
	if (!editor.isActive("image")) return null;
	const src = editor.getAttributes("image").src;
	return typeof src === "string" && src ? src : null;
}
var DAY = 864e5;
var NOW = Date.parse("2026-09-12T12:00:00.000Z");
function daysAgo(days, hours = 0) {
	return NOW - days * DAY - hours * 60 * 60 * 1e3;
}
function note(partial) {
	return {
		...partial,
		pages: [partial.content]
	};
}
var SEED_NOTEBOOKS = [
	{
		id: "nb_personal",
		name: "Personal",
		hue: "forest",
		createdAt: daysAgo(14)
	},
	{
		id: "nb_reading",
		name: "Reading",
		hue: "umber",
		createdAt: daysAgo(10)
	},
	{
		id: "nb_work",
		name: "Work",
		hue: "slate",
		createdAt: daysAgo(8)
	}
];
var SEED_NOTES = [
	note({
		id: "note_welcome",
		notebookId: "nb_personal",
		title: "Welcome to Quire",
		pinned: true,
		createdAt: daysAgo(4),
		updatedAt: daysAgo(0, 2),
		content: `
<p>A quiet notebook for sentences that want a desk, not a feed. Pages live on this device — nothing is sent away.</p>
<img src="/welcome-desk.jpg" alt="An open notebook and fountain pen on a walnut desk">
<p>Write with <strong>weight</strong>, <em>emphasis</em>, <u>underline</u>, or a <mark data-color="#f3e2a0" style="background-color: #f3e2a0; color: #1c1917">highlight</mark>. Change the typeface from the bar above. Drop in a photograph with the image button, or paste one straight from the clipboard.</p>
<blockquote><p>Fill the page the way you would a paper one. Nobody is watching.</p></blockquote>
<ul>
<li><p>Start a notebook for each corner of your life</p></li>
<li><p>Pin the pages you return to</p></li>
<li><p>Search when the pile grows</p></li>
</ul>
<p>When a sheet fills, the next one appears. Choose a theme, a border, a zoom. The rest is ink.</p>
`.trim()
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
`.trim()
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
`.trim()
	})
];
function createSeed() {
	return {
		notebooks: SEED_NOTEBOOKS,
		notes: SEED_NOTES,
		activeNotebookId: "nb_personal",
		activeNoteId: "note_welcome"
	};
}
var NOTEBOOK_HUES = [
	"forest",
	"slate",
	"umber",
	"moss",
	"wine"
];
var THEMES = [
	"dark",
	"light",
	"navy",
	"leather"
];
var DEFAULT_PREFS = {
	theme: "dark",
	border: "folio",
	zoom: 1,
	showWordCount: true,
	spellcheck: true,
	suggestions: true
};
function notePages(note) {
	if (note.pages?.length) return note.pages;
	return [note.content || ""];
}
function isPageEmpty(html) {
	return plainText(html).length === 0 && !/<img\b/i.test(html);
}
function jsonToHtml(editor, json) {
	const node = editor.schema.nodeFromJSON(json);
	const serializer = DOMSerializer.fromSchema(editor.schema);
	const wrap = document.createElement("div");
	wrap.appendChild(serializer.serializeFragment(node.content));
	return wrap.innerHTML;
}
function blockIndex(editor, el) {
	const json = editor.getJSON().content ?? [];
	for (let i = 0; i < json.length; i += 1) {
		const pos = blockStart(editor, i);
		if (pos < 0) continue;
		const node = editor.view.nodeDOM(pos);
		if (node === el || node instanceof HTMLElement && node.contains(el) || el.contains(node)) return i;
	}
	return -1;
}
function blockStart(editor, index) {
	let pos = 0;
	const content = editor.state.doc.content;
	for (let i = 0; i < content.childCount; i += 1) {
		if (i === index) return pos;
		pos += content.child(i).nodeSize;
	}
	return -1;
}
function splitOverflow(editor, maxHeight) {
	const root = editor.view.dom;
	const blocks = Array.from(root.children).filter((el) => !el.classList.contains("ProseMirror-trailingBreak"));
	if (blocks.length < 2) return null;
	let overflowEl = null;
	for (const el of blocks) if (el.offsetTop + el.offsetHeight > maxHeight) {
		overflowEl = el;
		break;
	}
	if (!overflowEl) return null;
	let firstOverflow = blockIndex(editor, overflowEl);
	if (firstOverflow < 0) firstOverflow = blocks.indexOf(overflowEl);
	if (firstOverflow <= 0) return null;
	const content = editor.getJSON().content ?? [];
	if (content.length <= firstOverflow) return null;
	const keep = content.slice(0, firstOverflow);
	const moved = content.slice(firstOverflow);
	editor.commands.setContent({
		type: "doc",
		content: keep.length ? keep : [{ type: "paragraph" }]
	});
	return jsonToHtml(editor, {
		type: "doc",
		content: moved
	});
}
var DB_NAME = "quire";
var STORE_NAME = "kv";
function openDb() {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(/* @__PURE__ */ new Error("IndexedDB unavailable"));
			return;
		}
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
var idbStorage = {
	getItem: async (name) => {
		try {
			const db = await openDb();
			return await new Promise((resolve, reject) => {
				const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(name);
				req.onsuccess = () => resolve(req.result ?? null);
				req.onerror = () => reject(req.error);
			});
		} catch {
			return null;
		}
	},
	setItem: async (name, value) => {
		const db = await openDb();
		await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			tx.objectStore(STORE_NAME).put(value, name);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	},
	removeItem: async (name) => {
		const db = await openDb();
		await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			tx.objectStore(STORE_NAME).delete(name);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}
};
function nextHue(existing) {
	const used = new Set(existing.map((nb) => nb.hue));
	return NOTEBOOK_HUES.find((hue) => !used.has(hue)) ?? NOTEBOOK_HUES[existing.length % NOTEBOOK_HUES.length];
}
function migrateNote(note) {
	const pages = notePages(note);
	return {
		...note,
		pages,
		content: pages.join("")
	};
}
function withJoinedContent(note, pages) {
	return {
		...note,
		pages,
		content: pages.join(""),
		updatedAt: Date.now()
	};
}
var useNotebookStore = create()(persist((set, get) => ({
	...createSeed(),
	initialized: true,
	hasHydrated: true,
	focusMode: false,
	prefs: { ...DEFAULT_PREFS },
	completeHydration: () => set((state) => {
		if (!state.initialized) return {
			...createSeed(),
			initialized: true,
			hasHydrated: true,
			prefs: { ...DEFAULT_PREFS }
		};
		return {
			hasHydrated: true,
			notes: state.notes.map(migrateNote),
			prefs: {
				...DEFAULT_PREFS,
				...state.prefs
			}
		};
	}),
	setFocusMode: (value) => set({ focusMode: value }),
	setPrefs: (patch) => set((state) => ({ prefs: {
		...state.prefs,
		...patch
	} })),
	setActiveNotebook: (id) => {
		const notes = get().notes.filter((note) => note.notebookId === id);
		set({
			activeNotebookId: id,
			activeNoteId: (notes.find((note) => note.id === get().activeNoteId) ?? [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)[0])?.id ?? null,
			focusMode: false
		});
	},
	setActiveNote: (id) => set({ activeNoteId: id }),
	createNotebook: (name) => {
		const id = crypto.randomUUID();
		const notebook = {
			id,
			name: name.trim() || "Untitled notebook",
			hue: nextHue(get().notebooks),
			createdAt: Date.now()
		};
		set((state) => ({
			notebooks: [...state.notebooks, notebook],
			activeNotebookId: id,
			activeNoteId: null
		}));
		return id;
	},
	renameNotebook: (id, name) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		set((state) => ({ notebooks: state.notebooks.map((nb) => nb.id === id ? {
			...nb,
			name: trimmed
		} : nb) }));
	},
	deleteNotebook: (id) => {
		const { notebooks, notes, activeNotebookId } = get();
		let nextNotebooks = notebooks.filter((nb) => nb.id !== id);
		if (nextNotebooks.length === 0) nextNotebooks = [{
			id: crypto.randomUUID(),
			name: "Pages",
			hue: "forest",
			createdAt: Date.now()
		}];
		const nextActive = activeNotebookId === id ? nextNotebooks[0].id : activeNotebookId;
		const nextNotes = notes.filter((note) => note.notebookId !== id);
		const inNotebook = nextNotes.filter((note) => note.notebookId === nextActive);
		set({
			notebooks: nextNotebooks,
			notes: nextNotes,
			activeNotebookId: nextActive,
			activeNoteId: inNotebook[0]?.id ?? null
		});
	},
	createNote: (notebookId) => {
		const id = crypto.randomUUID();
		const target = notebookId ?? get().activeNotebookId ?? get().notebooks[0]?.id;
		if (!target) return id;
		const now = Date.now();
		const note = {
			id,
			notebookId: target,
			title: "Untitled",
			content: "",
			pages: [""],
			pinned: false,
			createdAt: now,
			updatedAt: now
		};
		set((state) => ({
			notes: [note, ...state.notes],
			activeNotebookId: target,
			activeNoteId: id
		}));
		return id;
	},
	updateNote: (id, patch) => {
		set((state) => ({ notes: state.notes.map((item) => {
			if (item.id !== id) return item;
			const next = {
				...item,
				...patch,
				updatedAt: Date.now()
			};
			if (patch.pages) next.content = patch.pages.join("");
			else if (patch.content !== void 0 && !patch.pages) {
				const pages = [...notePages(item)];
				pages[0] = patch.content;
				next.pages = pages;
				next.content = pages.join("");
			}
			return next;
		}) }));
	},
	updateNotePage: (id, pageIndex, html) => {
		set((state) => ({ notes: state.notes.map((item) => {
			if (item.id !== id) return item;
			const pages = [...notePages(item)];
			while (pages.length <= pageIndex) pages.push("");
			pages[pageIndex] = html;
			return withJoinedContent(item, pages);
		}) }));
	},
	insertNotePage: (id, atIndex, html = "") => {
		const item = get().notes.find((note) => note.id === id);
		if (!item) return 0;
		const pages = [...notePages(item)];
		const index = Math.max(0, Math.min(atIndex, pages.length));
		pages.splice(index, 0, html);
		set((state) => ({ notes: state.notes.map((note) => note.id === id ? withJoinedContent(note, pages) : note) }));
		return index;
	},
	setNotePages: (id, pages) => {
		set((state) => ({ notes: state.notes.map((note) => note.id === id ? withJoinedContent(note, pages) : note) }));
	},
	deleteNote: (id) => {
		const { notes, activeNoteId } = get();
		const target = notes.find((note) => note.id === id);
		const remaining = notes.filter((note) => note.id !== id);
		let nextActive = activeNoteId;
		if (activeNoteId === id) nextActive = remaining.filter((note) => note.notebookId === target?.notebookId).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null;
		set({
			notes: remaining,
			activeNoteId: nextActive
		});
	},
	duplicateNote: (id) => {
		const source = get().notes.find((note) => note.id === id);
		if (!source) return null;
		const copyId = crypto.randomUUID();
		const now = Date.now();
		const pages = [...notePages(source)];
		const copy = {
			...source,
			id: copyId,
			title: source.title.endsWith(" copy") ? source.title : `${source.title} copy`,
			pinned: false,
			createdAt: now,
			updatedAt: now,
			pages,
			content: pages.join("")
		};
		set((state) => ({
			notes: [copy, ...state.notes],
			activeNoteId: copyId
		}));
		return copyId;
	},
	togglePin: (id) => {
		set((state) => ({ notes: state.notes.map((note) => note.id === id ? {
			...note,
			pinned: !note.pinned,
			updatedAt: Date.now()
		} : note) }));
	},
	moveNote: (id, notebookId) => {
		set((state) => ({
			notes: state.notes.map((note) => note.id === id ? {
				...note,
				notebookId,
				updatedAt: Date.now()
			} : note),
			activeNotebookId: notebookId,
			activeNoteId: id
		}));
	}
}), {
	name: "quire-v1",
	storage: idbStorage,
	skipHydration: true,
	partialize: (state) => ({
		notebooks: state.notebooks,
		notes: state.notes,
		activeNotebookId: state.activeNotebookId,
		activeNoteId: state.activeNoteId,
		initialized: state.initialized,
		prefs: state.prefs
	}),
	onRehydrateStorage: () => (state) => {
		state?.completeHydration();
	},
	merge: (persisted, current) => {
		const from = persisted ?? {};
		return {
			...current,
			...from,
			notes: (from.notes ?? current.notes).map(migrateNote),
			prefs: {
				...DEFAULT_PREFS,
				...from.prefs
			}
		};
	}
}));
function ToolBtn({ label, active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "button",
			variant: "ghost",
			size: "icon-sm",
			"aria-label": label,
			"aria-pressed": active,
			onClick,
			className: cn("text-ink-muted", active && "bg-paper-inset text-ink"),
			children
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: label })] });
}
function Chip({ label, active, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-pressed": active,
		onClick,
		className: cn("rounded-full px-2.5 py-1 text-xs transition-colors duration-150", active ? "bg-forest text-forest-fg" : "bg-paper-inset text-ink-muted hover:text-ink"),
		children: label
	});
}
function selectedText(editor) {
	const { from, to } = editor.state.selection;
	return editor.state.doc.textBetween(from, to, " ").trim();
}
function EditorToolbar({ editor }) {
	const fileRef = (0, import_react.useRef)(null);
	const [linkOpen, setLinkOpen] = (0, import_react.useState)(false);
	const [linkUrl, setLinkUrl] = (0, import_react.useState)("");
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	const [lookupOpen, setLookupOpen] = (0, import_react.useState)(false);
	const [sense, setSense] = (0, import_react.useState)(null);
	const [looking, setLooking] = (0, import_react.useState)(false);
	const suggestions = useNotebookStore((s) => s.prefs.suggestions);
	const ui = useEditorState({
		editor,
		selector: ({ editor: ed }) => ({
			bold: ed.isActive("bold"),
			italic: ed.isActive("italic"),
			underline: ed.isActive("underline"),
			strike: ed.isActive("strike"),
			h1: ed.isActive("heading", { level: 1 }),
			h2: ed.isActive("heading", { level: 2 }),
			h3: ed.isActive("heading", { level: 3 }),
			bullet: ed.isActive("bulletList"),
			ordered: ed.isActive("orderedList"),
			task: ed.isActive("taskList"),
			quote: ed.isActive("blockquote"),
			highlight: ed.getAttributes("highlight").color,
			font: ed.getAttributes("textStyle").fontFamily,
			size: ed.getAttributes("textStyle").fontSize,
			color: ed.getAttributes("textStyle").color,
			center: ed.isActive({ textAlign: "center" }),
			right: ed.isActive({ textAlign: "right" }),
			link: ed.isActive("link") || Boolean(ed.getAttributes("image").href),
			image: ed.isActive("image"),
			imageSrc: selectedImageSrc(ed),
			imageFit: ed.getAttributes("image").fit ?? null,
			imageSize: ed.getAttributes("image").size ?? null,
			imageAlign: ed.getAttributes("image").align ?? "center",
			imageWrap: ed.getAttributes("image").wrap ?? null
		})
	});
	async function onPickImages(files) {
		const images = collectImageFiles(files);
		if (!images.length) {
			toast.error("Use a JPEG, PNG, GIF, or WebP image.");
			return;
		}
		try {
			await insertImages(editor, images);
		} catch {
			toast.error("Could not add that image.");
		}
	}
	function applyLink(href) {
		const url = href.trim();
		if (!url) return;
		if (ui.image) editor.chain().focus().updateAttributes("image", { href: url }).run();
		else editor.chain().focus().setLink({
			href: url,
			target: "_blank"
		}).run();
	}
	function removeLink() {
		if (ui.image) editor.chain().focus().updateAttributes("image", { href: null }).run();
		else editor.chain().focus().unsetLink().run();
	}
	function linkToSearch() {
		const query = selectedText(editor) || editor.getAttributes("image").alt || "";
		if (!query) {
			toast.error("Select text or an image caption first.");
			return;
		}
		applyLink(webSearchUrl(query));
		setLinkOpen(false);
	}
	async function openLookup() {
		const word = selectedText(editor);
		setLookupOpen(true);
		if (!word) {
			setSense(null);
			return;
		}
		setLooking(true);
		setSense(await fetchSense(word));
		setLooking(false);
	}
	function replaceSelection(next) {
		editor.chain().focus().insertContent(next).run();
		setLookupOpen(false);
	}
	function setImageLayout(patch) {
		editor.chain().focus().updateAttributes("image", patch).run();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-b border-rule bg-paper-raised/90 backdrop-blur-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-0.5 px-2 py-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Bold",
					active: ui.bold,
					onClick: () => editor.chain().focus().toggleBold().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bold, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Italic",
					active: ui.italic,
					onClick: () => editor.chain().focus().toggleItalic().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Italic, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Underline",
					active: ui.underline,
					onClick: () => editor.chain().focus().toggleUnderline().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Underline, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Strikethrough",
					active: ui.strike,
					onClick: () => editor.chain().focus().toggleStrike().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Strikethrough, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-1 h-5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Heading 1",
					active: ui.h1,
					onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading1, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Heading 2",
					active: ui.h2,
					onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading2, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Heading 3",
					active: ui.h3,
					onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heading3, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-1 h-5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Bulleted list",
					active: ui.bullet,
					onClick: () => editor.chain().focus().toggleBulletList().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Numbered list",
					active: ui.ordered,
					onClick: () => editor.chain().focus().toggleOrderedList().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListOrdered, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Checklist",
					active: ui.task,
					onClick: () => editor.chain().focus().toggleTaskList().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Quote",
					active: ui.quote,
					onClick: () => editor.chain().focus().toggleBlockquote().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-1 h-5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Highlight",
							className: cn("text-ink-muted", ui.highlight && "bg-paper-inset text-ink"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Highlighter, {})
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Highlight" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
					className: "w-44",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-1 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase",
						children: "Highlight"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-5 gap-1.5",
						children: HIGHLIGHTS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": item.label,
							className: cn("inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold", item.swatch),
							style: "color" in item ? { color: "var(--color-highlight-ink)" } : void 0,
							onClick: () => {
								if (item.id === "none" || !("color" in item)) editor.chain().focus().unsetHighlight().run();
								else editor.chain().focus().toggleHighlight({ color: item.color }).run();
							},
							children: item.id === "none" ? "" : "A"
						}, item.id))
					})]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FontPicker, {
					editor,
					current: ui.font
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							"aria-label": "Font size",
							className: "h-9 px-2 text-ink-muted",
							children: "Size"
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Font size" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
					className: "w-40 p-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset",
						onClick: () => editor.chain().focus().unsetFontSize().run(),
						children: "Default"
					}), FONT_SIZES.map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn("flex w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-inset", ui.size === size.value && "bg-paper-inset"),
						onClick: () => editor.chain().focus().setFontSize(size.value).run(),
						children: size.label
					}, size.id))]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Ink color",
							className: "text-ink-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "size-3.5 rounded-full border border-rule",
								style: { background: ui.color || "var(--color-ink)" }
							})
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Ink color" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
					className: "w-40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-1 pb-2 text-xs font-medium tracking-wide text-ink-subtle uppercase",
							children: "Ink"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-1.5",
							children: INK_COLORS.map((ink) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": ink.label,
								className: cn("size-7 rounded-md", ink.swatch),
								onClick: () => editor.chain().focus().setColor(ink.color).run()
							}, ink.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-paper-inset",
							onClick: () => editor.chain().focus().unsetColor().run(),
							children: "Reset"
						})
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Alignment",
							className: "text-ink-muted",
							children: ui.center ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignCenter, {}) : ui.right ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignRight, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignLeft, {})
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Alignment" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
					className: "flex w-auto gap-0.5 p-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
							label: "Align left",
							active: !ui.center && !ui.right,
							onClick: () => editor.chain().focus().setTextAlign("left").run(),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignLeft, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
							label: "Align center",
							active: ui.center,
							onClick: () => editor.chain().focus().setTextAlign("center").run(),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignCenter, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
							label: "Align right",
							active: ui.right,
							onClick: () => editor.chain().focus().setTextAlign("right").run(),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignRight, {})
						})
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-1 h-5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: fileRef,
					type: "file",
					accept: IMAGE_ACCEPT,
					multiple: true,
					className: "hidden",
					onChange: (e) => {
						onPickImages(e.target.files);
						e.target.value = "";
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Insert image",
					onClick: () => fileRef.current?.click(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, {})
				}),
				ui.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Edit image",
					onClick: () => setEditOpen(true),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crop, {})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
					open: linkOpen,
					onOpenChange: (open) => {
						setLinkOpen(open);
						if (open) {
							const href = ui.image ? String(editor.getAttributes("image").href ?? "") : String(editor.getAttributes("link").href ?? "");
							setLinkUrl(href);
						}
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Link",
								className: cn("text-ink-muted", ui.link && "bg-paper-inset text-ink"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, {})
							})
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Link" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
						className: "w-72 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-ink-muted",
								children: "Link selected text or a picture. Use a web search for a quick look-up."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "https://",
								value: linkUrl,
								onChange: (e) => setLinkUrl(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										applyLink(linkUrl);
										setLinkOpen(false);
									}
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap justify-end gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										size: "sm",
										onClick: linkToSearch,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-3.5" }), "Search"]
									}),
									ui.link ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "outline",
										size: "sm",
										onClick: () => {
											removeLink();
											setLinkOpen(false);
										},
										children: "Remove"
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										onClick: () => {
											applyLink(linkUrl);
											setLinkOpen(false);
										},
										children: "Apply"
									})
								]
							})
						]
					})]
				}),
				suggestions ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
					open: lookupOpen,
					onOpenChange: setLookupOpen,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Look up word",
								className: "text-ink-muted",
								onClick: () => void openLookup(),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, {})
							})
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Look up word" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
						className: "w-80",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WordLookupCard, {
							sense,
							loading: looking,
							onReplace: replaceSelection
						})
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBtn, {
					label: "Divider",
					onClick: () => editor.chain().focus().setHorizontalRule().run(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageEditor, {
					open: editOpen,
					src: ui.imageSrc,
					onOpenChange: setEditOpen,
					onApply: (next) => editor.chain().focus().updateAttributes("image", { src: next }).run()
				})
			]
		}), ui.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-1.5 border-t border-rule/70 px-2 py-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "pr-1 text-xs font-medium tracking-wide text-ink-subtle uppercase",
					children: "Picture"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Fit",
					active: ui.imageFit === "fit",
					onClick: () => setImageLayout({
						fit: "fit",
						size: null,
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Stretch",
					active: ui.imageFit === "stretch",
					onClick: () => setImageLayout({
						fit: "stretch",
						size: null,
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Fill",
					active: ui.imageFit === "fill",
					onClick: () => setImageLayout({
						fit: "fill",
						size: null,
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Watermark",
					active: ui.imageFit === "watermark",
					onClick: () => setImageLayout({
						fit: "watermark",
						size: null,
						align: "right",
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-1 h-5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "S",
					active: ui.imageSize === "small",
					onClick: () => setImageLayout({
						size: "small",
						fit: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "M",
					active: ui.imageSize === "medium",
					onClick: () => setImageLayout({
						size: "medium",
						fit: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "L",
					active: ui.imageSize === "large",
					onClick: () => setImageLayout({
						size: "large",
						fit: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Full",
					active: ui.imageSize === "full",
					onClick: () => setImageLayout({
						size: "full",
						fit: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-1 h-5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Left",
					active: ui.imageAlign === "left" && !ui.imageWrap,
					onClick: () => setImageLayout({
						align: "left",
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Center",
					active: ui.imageAlign === "center" && !ui.imageWrap,
					onClick: () => setImageLayout({
						align: "center",
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Right",
					active: ui.imageAlign === "right" && !ui.imageWrap,
					onClick: () => setImageLayout({
						align: "right",
						wrap: null
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Wrap left",
					active: ui.imageWrap === "left",
					onClick: () => setImageLayout({
						wrap: "left",
						align: "left",
						fit: ui.imageFit === "fit" || ui.imageFit === "stretch" || ui.imageFit === "fill" ? null : ui.imageFit
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					label: "Wrap right",
					active: ui.imageWrap === "right",
					onClick: () => setImageLayout({
						wrap: "right",
						align: "right",
						fit: ui.imageFit === "fit" || ui.imageFit === "stretch" || ui.imageFit === "fill" ? null : ui.imageFit
					})
				})
			]
		}) : null]
	});
}
function VineCorner({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("paper-corner", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 52 52",
			fill: "none",
			"aria-hidden": true,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M4 48c6-18 14-28 30-34M8 44c10-4 22-6 36-4",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "12",
					cy: "40",
					r: "1.6",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "34",
					cy: "16",
					r: "1.4",
					fill: "currentColor"
				})
			]
		})
	});
}
function PageSheet({ border, oversized, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-border": border,
		className: cn("paper-sheet", oversized && "is-oversized", className),
		children: [border === "vine" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VineCorner, { className: "top-1 left-1" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VineCorner, { className: "top-1 right-1 rotate-90" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VineCorner, { className: "bottom-1 left-1 -rotate-90" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VineCorner, { className: "right-1 bottom-1 rotate-180" })
		] }) : null, children]
	});
}
var QuireHighlight = src_default.extend({ addAttributes() {
	return { color: {
		default: null,
		parseHTML: (element) => element.getAttribute("data-color") || element.style.backgroundColor || null,
		renderHTML: (attributes) => {
			if (!attributes.color) return {};
			return {
				"data-color": attributes.color,
				style: `background-color: ${attributes.color}; color: var(--color-highlight-ink)`
			};
		}
	} };
} });
function dataAttr(name, value, skip) {
	if (value == null || value === "" || value === skip) return {};
	return { [name]: String(value) };
}
var QuireImage = src_default$1.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			href: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-href") || element.closest("a")?.getAttribute("href"),
				renderHTML: (attributes) => attributes.href ? { "data-href": attributes.href } : {}
			},
			fit: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-fit"),
				renderHTML: (attributes) => dataAttr("data-fit", attributes.fit)
			},
			size: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-size"),
				renderHTML: (attributes) => dataAttr("data-size", attributes.size)
			},
			align: {
				default: "center",
				parseHTML: (element) => element.getAttribute("data-align") || "center",
				renderHTML: (attributes) => dataAttr("data-align", attributes.align, "center")
			},
			wrap: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-wrap"),
				renderHTML: (attributes) => dataAttr("data-wrap", attributes.wrap)
			}
		};
	},
	renderHTML({ HTMLAttributes }) {
		const href = HTMLAttributes.href;
		const rest = { ...HTMLAttributes };
		delete rest.href;
		const img = ["img", mergeAttributes(this.options.HTMLAttributes, rest)];
		if (href) return [
			"a",
			{
				href,
				target: "_blank",
				rel: "noopener noreferrer",
				class: "quire-image-link"
			},
			img
		];
		return img;
	}
});
var editorExtensions = [
	src_default$4.configure({
		heading: { levels: [
			1,
			2,
			3
		] },
		link: {
			openOnClick: false,
			autolink: true
		}
	}),
	TextStyleKit.configure({
		backgroundColor: false,
		lineHeight: false
	}),
	QuireHighlight.configure({
		multicolor: true,
		HTMLAttributes: { class: "quire-mark" }
	}),
	QuireImage.configure({
		allowBase64: true,
		HTMLAttributes: { class: "quire-image" },
		resize: {
			enabled: true,
			alwaysPreserveAspectRatio: false,
			minWidth: 80,
			minHeight: 80
		}
	}),
	src_default$2.configure({ placeholder: "Start a page…" }),
	src_default$3.configure({ types: ["heading", "paragraph"] }),
	TaskList,
	TaskItem.configure({ nested: true })
];
function RichEditor({ note, title, pageIndex, onPageIndexChange, onTitleChange, onChange }) {
	const editorRef = (0, import_react.useRef)(null);
	const onChangeRef = (0, import_react.useRef)(onChange);
	onChangeRef.current = onChange;
	const splittingRef = (0, import_react.useRef)(false);
	const sheetRef = (0, import_react.useRef)(null);
	const [oversized, setOversized] = (0, import_react.useState)(false);
	const prefs = useNotebookStore((s) => s.prefs);
	const insertNotePage = useNotebookStore((s) => s.insertNotePage);
	const setNotePages = useNotebookStore((s) => s.setNotePages);
	const pages = notePages(note);
	const pageCount = Math.max(1, pages.length);
	const safeIndex = Math.min(pageIndex, pageCount - 1);
	const pageHtml = pages[safeIndex] ?? "";
	const pagesRef = (0, import_react.useRef)(pages);
	pagesRef.current = pages;
	const editor = useEditor({
		immediatelyRender: false,
		extensions: editorExtensions,
		content: pageHtml || "",
		editorProps: {
			attributes: {
				class: "quire-doc tiptap min-h-full px-1 pb-6 focus:outline-none",
				spellcheck: prefs.spellcheck ? "true" : "false"
			},
			handlePaste(_view, event) {
				const files = collectImageFiles(event.clipboardData?.files);
				if (!files.length || !editorRef.current) return false;
				event.preventDefault();
				insertImages(editorRef.current, files).catch(() => toast.error("Could not paste that image."));
				return true;
			},
			handleDrop(_view, event, _slice, moved) {
				if (moved) return false;
				const files = collectImageFiles(event.dataTransfer?.files);
				if (!files.length || !editorRef.current) return false;
				event.preventDefault();
				insertImages(editorRef.current, files).catch(() => toast.error("Could not add that image."));
				return true;
			},
			handleClick(_view, _pos, event) {
				if (event.target?.closest("a.quire-image-link")) {
					event.preventDefault();
					return true;
				}
				return false;
			}
		},
		onUpdate: ({ editor: ed }) => {
			if (splittingRef.current) return;
			onChangeRef.current(ed.getHTML(), safeIndex);
		}
	});
	editorRef.current = editor;
	(0, import_react.useEffect)(() => {
		if (!editor) return;
		editor.setOptions({ editorProps: {
			...editor.options.editorProps,
			attributes: {
				class: "quire-doc tiptap min-h-full px-1 pb-6 focus:outline-none",
				spellcheck: prefs.spellcheck ? "true" : "false"
			}
		} });
	}, [editor, prefs.spellcheck]);
	(0, import_react.useEffect)(() => {
		if (!editor) return;
		function checkOverflow() {
			if (!editor || splittingRef.current) return;
			const root = editor.view.dom;
			const maxHeight = sheetRef.current ? Math.max(180, sheetRef.current.clientHeight - 48) : 640;
			if (!(root.scrollHeight > maxHeight + 12)) {
				setOversized(false);
				return;
			}
			splittingRef.current = true;
			const moved = splitOverflow(editor, maxHeight);
			if (moved) {
				const current = [...pagesRef.current];
				current[safeIndex] = editor.getHTML();
				const nextIndex = safeIndex + 1;
				if (current[nextIndex]) current[nextIndex] = `${moved}${current[nextIndex]}`;
				else current.splice(nextIndex, 0, moved);
				setNotePages(note.id, current);
				if (editor.view.hasFocus()) onPageIndexChange(nextIndex);
				setOversized(false);
			} else setOversized(true);
			splittingRef.current = false;
		}
		const timer = window.setTimeout(checkOverflow, 120);
		editor.on("update", checkOverflow);
		const onLoad = () => checkOverflow();
		editor.view.dom.addEventListener("load", onLoad, true);
		editor.view.dom.querySelectorAll("img").forEach((img) => {
			if (img.complete) checkOverflow();
		});
		const ro = new ResizeObserver(() => checkOverflow());
		ro.observe(editor.view.dom);
		return () => {
			window.clearTimeout(timer);
			editor.off("update", checkOverflow);
			editor.view.dom.removeEventListener("load", onLoad, true);
			ro.disconnect();
		};
	}, [
		editor,
		note.id,
		safeIndex,
		onPageIndexChange,
		setNotePages
	]);
	const zoom = prefs.zoom;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [editor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorToolbar, { editor }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-12 border-b border-rule bg-paper-raised" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-y-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto w-full max-w-3xl px-4 pt-5 pb-16 md:px-6",
				style: { zoom },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: title,
						rows: 1,
						placeholder: "Title",
						"aria-label": "Page title",
						suppressHydrationWarning: true,
						onChange: (e) => {
							onTitleChange(e.target.value);
							e.currentTarget.style.height = "auto";
							e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
						},
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								editor?.commands.focus("start");
							}
						},
						className: "mb-4 w-full resize-none bg-transparent font-display text-3xl leading-tight font-semibold tracking-tight text-ink placeholder:text-ink-subtle focus:outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageSheet, {
						border: prefs.border,
						oversized,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: sheetRef,
							className: cn("paper-body px-6 py-6 md:px-8", oversized && "is-oversized"),
							children: editor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorContent, { editor }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "quire-doc",
								dangerouslySetInnerHTML: { __html: pageHtml }
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-center justify-center gap-2 text-sm text-ink-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Previous sheet",
								disabled: safeIndex === 0,
								onClick: () => onPageIndexChange(Math.max(0, safeIndex - 1)),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tabular-nums",
								children: [
									"Sheet ",
									safeIndex + 1,
									" of ",
									pageCount
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Next sheet",
								disabled: safeIndex >= pageCount - 1,
								onClick: () => onPageIndexChange(Math.min(pageCount - 1, safeIndex + 1)),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									onPageIndexChange(insertNotePage(note.id, safeIndex + 1, ""));
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "Sheet"]
							}),
							pageCount > 1 && isPageEmpty(pageHtml) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									const nextPages = pages.filter((_, i) => i !== safeIndex);
									setNotePages(note.id, nextPages.length ? nextPages : [""]);
									onPageIndexChange(Math.max(0, safeIndex - 1));
								},
								children: "Remove"
							}) : null
						]
					})
				]
			})
		})]
	});
}
function AlertDialog({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2, { ...props });
}
function AlertDialogContent({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Portal2, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, { className: cn("fixed inset-0 z-50 bg-ink/40", "data-[state=open]:animate-in data-[state=open]:fade-in-0", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		className: cn("fixed top-1/2 left-1/2 z-50 w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 -translate-y-1/2", "rounded-3xl bg-paper-raised p-5 text-ink shadow-[var(--shadow-lift)]", "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className),
		...props
	})] });
}
function AlertDialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1.5", className),
		...props
	});
}
function AlertDialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
		...props
	});
}
function AlertDialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
		className: cn("font-display text-xl font-semibold tracking-tight", className),
		...props
	});
}
function AlertDialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
		className: cn("text-sm text-ink-muted", className),
		...props
	});
}
function AlertDialogAction({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
		className: cn(buttonVariants(), className),
		...props
	});
}
function AlertDialogCancel({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
		className: cn(buttonVariants({ variant: "outline" }), className),
		...props
	});
}
function DropdownMenu({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2$1, { ...props });
}
function DropdownMenuTrigger({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, { ...props });
}
function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2$1, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
		sideOffset,
		className: cn("z-50 min-w-44 overflow-hidden rounded-xl border border-rule bg-paper-raised p-1 text-ink shadow-[var(--shadow-lift)]", "origin-[var(--radix-dropdown-menu-content-transform-origin)]", "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className),
		...props
	}) });
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
		className: cn("relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none", "focus:bg-paper-inset data-disabled:pointer-events-none data-disabled:opacity-50", "[&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", variant === "destructive" && "text-destructive focus:bg-destructive/10", className),
		...props
	});
}
function DropdownMenuSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
		className: cn("-mx-1 my-1 h-px bg-rule", className),
		...props
	});
}
function DropdownMenuSub({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sub2, { ...props });
}
function DropdownMenuSubTrigger({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubTrigger2, {
		className: cn("flex cursor-pointer items-center rounded-md px-2 py-2 text-sm outline-none select-none focus:bg-paper-inset data-[state=open]:bg-paper-inset", className),
		...props,
		children
	});
}
function DropdownMenuSubContent({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
		className: cn("z-50 min-w-40 overflow-hidden rounded-xl border border-rule bg-paper-raised p-1 shadow-[var(--shadow-lift)]", className),
		...props
	});
}
function exportNote(title, content) {
	const safe = title.replace(/[^\w\s-]+/g, "").trim() || "untitled";
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 1.125rem/1.7 Georgia, serif; color: #1c1917; max-width: 42rem; margin: 3rem auto; padding: 0 1.25rem; }
  img { max-width: 100%; height: auto; }
  blockquote { border-left: 2px solid #3f534c; padding-left: 1rem; color: #6e6860; font-style: italic; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${content}
</body>
</html>`;
	const blob = new Blob([html], { type: "text/html" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${safe}.html`;
	a.click();
	URL.revokeObjectURL(url);
}
function EditorPane({ onBack, onOpenSettings, className }) {
	const notes = useNotebookStore((s) => s.notes);
	const notebooks = useNotebookStore((s) => s.notebooks);
	const activeNoteId = useNotebookStore((s) => s.activeNoteId);
	const focusMode = useNotebookStore((s) => s.focusMode);
	const setFocusMode = useNotebookStore((s) => s.setFocusMode);
	const prefs = useNotebookStore((s) => s.prefs);
	const setPrefs = useNotebookStore((s) => s.setPrefs);
	const createNote = useNotebookStore((s) => s.createNote);
	const updateNote = useNotebookStore((s) => s.updateNote);
	const updateNotePage = useNotebookStore((s) => s.updateNotePage);
	const deleteNote = useNotebookStore((s) => s.deleteNote);
	const duplicateNote = useNotebookStore((s) => s.duplicateNote);
	const togglePin = useNotebookStore((s) => s.togglePin);
	const moveNote = useNotebookStore((s) => s.moveNote);
	const note = notes.find((item) => item.id === activeNoteId) ?? null;
	const [title, setTitle] = (0, import_react.useState)(note?.title ?? "");
	const [pageIndex, setPageIndex] = (0, import_react.useState)(0);
	const [saveState, setSaveState] = (0, import_react.useState)("saved");
	const [deleteOpen, setDeleteOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setTitle(note?.title ?? "");
		setPageIndex(0);
		setSaveState("saved");
	}, [note?.id]);
	const save = (0, import_react.useMemo)(() => debounce((id, patch) => {
		updateNote(id, patch);
		setSaveState("saved");
	}, 400), [updateNote]);
	const savePage = (0, import_react.useMemo)(() => debounce((id, index, content) => {
		updateNotePage(id, index, content);
		setSaveState("saved");
	}, 400), [updateNotePage]);
	(0, import_react.useEffect)(() => () => {
		save.flush();
		savePage.flush();
	}, [save, savePage]);
	if (!note) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("flex h-full min-h-0 flex-col quire-page", className),
		children: [onBack ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center px-2 pt-3 md:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon",
				"aria-label": "Back to pages",
				onClick: onBack,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {})
			})
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-1 flex-col items-center justify-center px-6 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-semibold tracking-tight text-ink",
					children: "A blank desk"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-sm text-pretty text-ink-muted",
					children: "Start a page in this notebook, or choose one from the list."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-5",
					onClick: () => createNote(),
					children: "New page"
				})
			]
		})]
	});
	const allHtml = notePages(note).join(" ");
	const words = wordCount(allHtml);
	const chars = plainText(allHtml).length;
	const zoomPct = Math.round(prefs.zoom * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("flex h-full min-h-0 flex-col bg-paper quire-page", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-1 border-b border-rule/80 bg-paper-raised/80 px-2 py-1.5",
				children: [
					onBack ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						className: "md:hidden",
						"aria-label": "Back to pages",
						onClick: onBack,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "min-w-0 flex-1 truncate px-2 text-sm text-ink-muted",
						children: saveState === "saving" ? "Saving" : "Saved on this device"
					}),
					onOpenSettings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						"aria-label": "Desk settings",
						onClick: onOpenSettings,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						"aria-label": focusMode ? "Exit focus" : "Focus",
						onClick: () => setFocusMode(!focusMode),
						className: "hidden md:inline-flex",
						children: focusMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize2, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "Page actions",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {})
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
						align: "end",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onSelect: () => togglePin(note.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "size-4" }), note.pinned ? "Unpin" : "Pin"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onSelect: () => duplicateNote(note.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), "Duplicate"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuSub, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuSubTrigger, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderInput, { className: "mr-2 size-4" }), "Move to"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSubContent, { children: notebooks.map((nb) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
								disabled: nb.id === note.notebookId,
								onSelect: () => moveNote(note.id, nb.id),
								children: nb.name
							}, nb.id)) })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onSelect: () => exportNote(title || "Untitled", allHtml),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), "Export HTML"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								variant: "destructive",
								onSelect: () => setDeleteOpen(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), "Delete"]
							})
						]
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichEditor, {
				note,
				title,
				pageIndex,
				onPageIndexChange: setPageIndex,
				onTitleChange: (next) => {
					setTitle(next);
					setSaveState("saving");
					save(note.id, { title: next.trim() || "Untitled" });
				},
				onChange: (next, index) => {
					setSaveState("saving");
					savePage(note.id, index, next);
				}
			}, `${note.id}:${pageIndex}`),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "flex items-center justify-between gap-3 border-t border-rule/80 px-3 py-2 text-xs text-ink-subtle",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 truncate tabular-nums",
					children: prefs.showWordCount ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						words,
						" ",
						words === 1 ? "word" : "words",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-ink-subtle/70",
							children: [
								" · ",
								chars,
								" characters"
							]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						suppressHydrationWarning: true,
						children: ["Edited ", formatDistanceToNow(note.updatedAt, { addSuffix: true })]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Zoom out",
							className: "size-8",
							onClick: () => setPrefs({ zoom: Math.max(.7, Math.round((prefs.zoom - .1) * 10) / 10) }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							className: "w-24",
							min: 70,
							max: 160,
							step: 5,
							value: [zoomPct],
							onValueChange: ([value]) => setPrefs({ zoom: value / 100 }),
							"aria-label": "Page zoom"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Zoom in",
							className: "size-8",
							onClick: () => setPrefs({ zoom: Math.min(1.6, Math.round((prefs.zoom + .1) * 10) / 10) }),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "w-9 text-right tabular-nums",
							children: [zoomPct, "%"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: deleteOpen,
				onOpenChange: setDeleteOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete this page?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"“",
					title || "Untitled",
					"” will be removed from this device."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
					onClick: () => {
						deleteNote(note.id);
						toast("Page deleted");
						onBack?.();
					},
					children: "Delete"
				})] })] })
			})
		]
	});
}
function NoteList({ onOpenNote, onOpenNotebooks, className }) {
	const notebooks = useNotebookStore((s) => s.notebooks);
	const notes = useNotebookStore((s) => s.notes);
	const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
	const activeNoteId = useNotebookStore((s) => s.activeNoteId);
	const setActiveNote = useNotebookStore((s) => s.setActiveNote);
	const createNote = useNotebookStore((s) => s.createNote);
	const [query, setQuery] = (0, import_react.useState)("");
	const notebook = notebooks.find((nb) => nb.id === activeNotebookId);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return notes.filter((note) => note.notebookId === activeNotebookId).filter((note) => {
			if (!q) return true;
			return note.title.toLowerCase().includes(q) || plainText(note.content).toLowerCase().includes(q);
		}).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
	}, [
		notes,
		activeNotebookId,
		query
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("flex h-full min-h-0 flex-col border-r border-rule bg-paper-raised safe-pad", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-2 px-3 pt-4 pb-3",
				children: [
					onOpenNotebooks ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						className: "md:hidden",
						"aria-label": "Notebooks",
						onClick: onOpenNotebooks,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-display text-lg leading-tight font-semibold tracking-tight text-ink",
							children: notebook?.name ?? "Pages"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-ink-subtle",
							children: [
								filtered.length,
								" ",
								filtered.length === 1 ? "page" : "pages"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						"aria-label": "New page",
						onClick: () => {
							createNote();
							onOpenNote?.();
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-3 pb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "relative block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: query,
						onChange: (e) => setQuery(e.target.value),
						placeholder: "Search pages",
						className: "h-10 bg-paper pl-9",
						"aria-label": "Search pages"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto px-2 pb-4",
				children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-3 py-10 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-base font-medium text-ink",
							children: "No pages yet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-ink-muted",
							children: query ? "Nothing matches that search." : "Start a page in this notebook."
						}),
						!query ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-4",
							onClick: () => {
								createNote();
								onOpenNote?.();
							},
							children: "New page"
						}) : null
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-0.5",
					children: filtered.map((note) => {
						const active = note.id === activeNoteId;
						const snippet = plainText(note.content);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setActiveNote(note.id);
								onOpenNote?.();
							},
							className: cn("flex w-full flex-col rounded-xl px-3 py-3 text-left transition-colors duration-150", active ? "bg-paper-inset" : "hover:bg-paper"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-start gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-0 flex-1 truncate font-medium text-ink",
										children: note.title || "Untitled"
									}), note.pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "mt-0.5 size-3.5 shrink-0 fill-current text-ink-muted" }) : null]
								}),
								snippet ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-0.5 line-clamp-2 text-sm leading-snug text-ink-muted",
									children: snippet
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1.5 text-xs text-ink-subtle tabular-nums",
									suppressHydrationWarning: true,
									children: formatDistanceToNow(note.updatedAt, { addSuffix: true })
								})
							]
						}) }, note.id);
					})
				})
			})
		]
	});
}
function QuireMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className: cn("size-7", className),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "4",
				y: "7",
				width: "16",
				height: "21",
				rx: "2",
				fill: "currentColor",
				opacity: "0.32"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "8",
				y: "5",
				width: "16",
				height: "21",
				rx: "2",
				fill: "currentColor",
				opacity: "0.55"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "12",
				y: "3",
				width: "16",
				height: "21",
				rx: "2",
				fill: "currentColor"
			})
		]
	});
}
var HUE_DOT = {
	forest: "bg-forest",
	slate: "bg-cream/40",
	umber: "bg-highlight-butter",
	moss: "bg-highlight-sage",
	wine: "bg-destructive"
};
function NotebookRail({ onSelect, onOpenSettings, className }) {
	const notebooks = useNotebookStore((s) => s.notebooks);
	const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
	const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
	const createNotebook = useNotebookStore((s) => s.createNotebook);
	const renameNotebook = useNotebookStore((s) => s.renameNotebook);
	const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);
	const [createOpen, setCreateOpen] = (0, import_react.useState)(false);
	const [createName, setCreateName] = (0, import_react.useState)("");
	const [renameId, setRenameId] = (0, import_react.useState)(null);
	const [renameName, setRenameName] = (0, import_react.useState)("");
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const deleting = notebooks.find((nb) => nb.id === deleteId);
	function submitCreate() {
		const name = createName.trim() || "Untitled notebook";
		createNotebook(name);
		setCreateName("");
		setCreateOpen(false);
		onSelect?.();
	}
	function submitRename() {
		if (!renameId) return;
		renameNotebook(renameId, renameName);
		setRenameId(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cn("flex h-full min-h-0 flex-col bg-leather text-cream safe-pad", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2.5 px-4 pt-5 pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuireMark, { className: "text-cream" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg leading-tight font-semibold tracking-tight",
						children: "Quire"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-cream/45",
						children: "A private notebook"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col px-3 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-2 pb-2 text-xs font-medium tracking-wide text-cream/40 uppercase",
					children: "Notebooks"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto",
					children: notebooks.map((nb) => {
						const active = nb.id === activeNotebookId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "group relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setActiveNotebook(nb.id);
									onSelect?.();
								},
								className: cn("flex h-11 w-full items-center gap-2.5 rounded-lg pr-10 pl-2.5 text-left text-sm transition-colors duration-150", active ? "bg-leather-hover text-cream" : "text-cream/70 hover:bg-leather-hover/80 hover:text-cream"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-2 shrink-0 rounded-full", HUE_DOT[nb.hue]) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate",
									children: nb.name
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": `More for ${nb.name}`,
									className: cn("absolute top-1 right-1 inline-flex size-9 items-center justify-center rounded-md text-cream/50 transition-colors duration-150 hover:bg-leather-raised hover:text-cream", "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "size-4" })
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
								align: "start",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									onSelect: () => {
										setRenameId(nb.id);
										setRenameName(nb.name);
									},
									children: "Rename"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									variant: "destructive",
									onSelect: () => setDeleteId(nb.id),
									children: "Delete"
								})]
							})] })]
						}, nb.id);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto space-y-1 p-3",
				children: [onOpenSettings ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "inverse",
					className: "h-11 w-full justify-start text-cream/80",
					onClick: onOpenSettings,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4" }), "Desk"]
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "inverse",
					className: "h-11 w-full justify-start text-cream/80",
					onClick: () => setCreateOpen(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New notebook"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: createOpen,
				onOpenChange: setCreateOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New notebook" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "A shelf for a corner of your life." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						autoFocus: true,
						placeholder: "Name",
						value: createName,
						onChange: (e) => setCreateName(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") submitCreate();
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setCreateOpen(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: submitCreate,
						children: "Create"
					})] })
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(renameId),
				onOpenChange: (open) => !open && setRenameId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Rename notebook" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "The name appears in the shelf." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						autoFocus: true,
						value: renameName,
						onChange: (e) => setRenameName(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") submitRename();
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setRenameId(null),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: submitRename,
						children: "Save"
					})] })
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: Boolean(deleteId),
				onOpenChange: (open) => !open && setDeleteId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, { children: [
					"Delete ",
					deleting?.name,
					"?"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This notebook and every page in it will be removed from this device." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
					onClick: () => {
						if (deleteId) deleteNotebook(deleteId);
						setDeleteId(null);
					},
					children: "Delete"
				})] })] })
			})
		]
	});
}
var BORDER_META = [
	{
		id: "none",
		label: "Bare",
		hint: "No frame"
	},
	{
		id: "hairline",
		label: "Hairline",
		hint: "A single thin rule"
	},
	{
		id: "double",
		label: "Double",
		hint: "Two nested rules"
	},
	{
		id: "folio",
		label: "Folio",
		hint: "A bookish inner plate"
	},
	{
		id: "gilt",
		label: "Gilt",
		hint: "A warm metal edge"
	},
	{
		id: "stitch",
		label: "Stitch",
		hint: "Saddle-stitched margin"
	},
	{
		id: "vine",
		label: "Vine",
		hint: "Corner flourishes"
	},
	{
		id: "deckle",
		label: "Deckle",
		hint: "Soft paper edge"
	},
	{
		id: "manuscript",
		label: "Manuscript",
		hint: "A left-hand rule"
	},
	{
		id: "mat",
		label: "Mat",
		hint: "A wide gallery mat"
	}
];
var THEME_META = {
	dark: {
		label: "Dark",
		paper: "#1a1714",
		ink: "#ece6dc",
		accent: "#8fa399",
		desk: "#0c0b0a"
	},
	light: {
		label: "Light",
		paper: "#f3eee6",
		ink: "#1c1917",
		accent: "#3f534c",
		desk: "#241f1c"
	},
	navy: {
		label: "Navy",
		paper: "#122038",
		ink: "#e8eef6",
		accent: "#8eb4dc",
		desk: "#0a1220"
	},
	leather: {
		label: "Leather",
		paper: "#231710",
		ink: "#f3e6d4",
		accent: "#c4a574",
		desk: "#120d0a"
	}
};
function applyTheme(theme) {
	if (typeof document === "undefined") return;
	document.documentElement.setAttribute("data-theme", theme);
	document.querySelector("meta[name=\"theme-color\"]")?.setAttribute("content", THEME_META[theme].desk);
}
function Switch({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
		className: cn("peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-rule bg-paper-inset transition-colors duration-150", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60", "data-[state=checked]:bg-forest data-[state=checked]:border-forest", "disabled:cursor-not-allowed disabled:opacity-50", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block size-4 rounded-full bg-cream shadow-sm transition-transform duration-150", "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[3px]") })
	});
}
function SettingsPanel({ open, onOpenChange }) {
	const prefs = useNotebookStore((s) => s.prefs);
	const setPrefs = useNotebookStore((s) => s.setPrefs);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "w-[min(calc(100%-1.5rem),32rem)] max-h-[85dvh] overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Desk" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Theme, page frame, and writing tools for this device." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "px-1 pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xs font-medium tracking-wide text-ink-subtle uppercase",
						children: "Mode"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4",
						children: THEMES.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeCard, {
							id,
							active: prefs.theme === id,
							onSelect: () => setPrefs({ theme: id })
						}, id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "px-1 pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xs font-medium tracking-wide text-ink-subtle uppercase",
						children: "Page border"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5",
						children: BORDER_META.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": prefs.border === item.id,
							onClick: () => setPrefs({ border: item.id }),
							className: cn("rounded-xl border px-2 py-2 text-left transition-colors duration-150", prefs.border === item.id ? "border-forest bg-paper-inset" : "border-rule hover:bg-paper-inset"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BorderSwatch, { id: item.id }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1.5 text-xs font-medium text-ink",
								children: item.label
							})]
						}, item.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "grid gap-3 px-1 pb-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xs font-medium tracking-wide text-ink-subtle uppercase",
							children: "Writing tools"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
							label: "Word count",
							hint: "Show words and characters under the page",
							checked: prefs.showWordCount,
							onCheckedChange: (checked) => setPrefs({ showWordCount: checked })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
							label: "Spelling marks",
							hint: "Underline misspellings using this device",
							checked: prefs.spellcheck,
							onCheckedChange: (checked) => setPrefs({ spellcheck: checked })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
							label: "Word suggestions",
							hint: "Synonyms, antonyms, and a short sense for a selected word",
							checked: prefs.suggestions,
							onCheckedChange: (checked) => setPrefs({ suggestions: checked })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-end px-1 pt-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => onOpenChange(false),
						children: "Done"
					})
				})
			]
		})
	});
}
function ToggleRow({ label, hint, checked, onCheckedChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-ink-muted",
				children: hint
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
			checked,
			onCheckedChange
		})]
	});
}
function ThemeCard({ id, active, onSelect }) {
	const meta = THEME_META[id];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-pressed": active,
		onClick: onSelect,
		className: cn("rounded-xl border p-2 text-left transition-colors duration-150", active ? "border-forest" : "border-rule hover:bg-paper-inset"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block h-12 rounded-lg",
			style: {
				background: `linear-gradient(180deg, ${meta.desk} 38%, ${meta.paper} 38%)`,
				boxShadow: `inset 0 0 0 1px ${meta.accent}55`
			}
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-1.5 block text-xs font-medium text-ink",
			children: meta.label
		})]
	});
}
function BorderSwatch({ id }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"data-border": id,
		className: "border-swatch"
	});
}
function Sheet({ open, onOpenChange, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
		open,
		onOpenChange,
		shouldScaleBackground: false,
		children
	});
}
function SheetContent({ className, children, side = "left" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "fixed inset-0 z-50 bg-ink/40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
		className: cn("fixed z-50 flex flex-col bg-leather text-cream outline-none", side === "left" ? "inset-y-0 left-0 w-[min(18rem,88vw)]" : "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl", className),
		children: [side === "bottom" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-cream/20" }), children]
	})] });
}
function SheetTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
		className: cn("font-display text-lg font-semibold", className),
		...props
	});
}
function AppShell() {
	const focusMode = useNotebookStore((s) => s.focusMode);
	const setFocusMode = useNotebookStore((s) => s.setFocusMode);
	const createNote = useNotebookStore((s) => s.createNote);
	const prefs = useNotebookStore((s) => s.prefs);
	const setPrefs = useNotebookStore((s) => s.setPrefs);
	const [notebooksOpen, setNotebooksOpen] = (0, import_react.useState)(false);
	const [mobileList, setMobileList] = (0, import_react.useState)(false);
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		useNotebookStore.persist.rehydrate();
	}, []);
	(0, import_react.useEffect)(() => {
		applyTheme(prefs.theme);
	}, [prefs.theme]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			const meta = event.metaKey || event.ctrlKey;
			if (meta && event.key.toLowerCase() === "n" && !event.shiftKey) {
				event.preventDefault();
				createNote();
				setMobileList(false);
			}
			if (event.key === "Escape" && useNotebookStore.getState().focusMode) setFocusMode(false);
			if (meta && (event.key === "=" || event.key === "+")) {
				event.preventDefault();
				const zoom = useNotebookStore.getState().prefs.zoom;
				setPrefs({ zoom: Math.min(1.6, Math.round((zoom + .1) * 10) / 10) });
			}
			if (meta && event.key === "-") {
				event.preventDefault();
				const zoom = useNotebookStore.getState().prefs.zoom;
				setPrefs({ zoom: Math.max(.7, Math.round((zoom - .1) * 10) / 10) });
			}
			if (meta && event.key === "0") {
				event.preventDefault();
				setPrefs({ zoom: 1 });
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		createNote,
		setFocusMode,
		setPrefs
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipProvider, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-dvh overflow-hidden bg-paper text-ink",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookRail, {
					className: cn("hidden w-52 shrink-0 md:flex", focusMode && "md:hidden"),
					onOpenSettings: () => setSettingsOpen(true)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoteList, {
					className: cn("w-full shrink-0 md:w-72", focusMode && "md:hidden", mobileList ? "flex" : "hidden md:flex"),
					onOpenNote: () => setMobileList(false),
					onOpenNotebooks: () => setNotebooksOpen(true)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorPane, {
					className: cn("min-w-0 flex-1", mobileList && "hidden md:flex"),
					onBack: () => setMobileList(true),
					onOpenSettings: () => setSettingsOpen(true)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
			open: notebooksOpen,
			onOpenChange: setNotebooksOpen,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
				side: "left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, {
					className: "sr-only",
					children: "Notebooks"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookRail, {
					onSelect: () => setNotebooksOpen(false),
					onOpenSettings: () => {
						setNotebooksOpen(false);
						setSettingsOpen(true);
					}
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsPanel, {
			open: settingsOpen,
			onOpenChange: setSettingsOpen
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			position: "bottom-right",
			toastOptions: { classNames: { toast: "bg-paper-raised text-ink border border-rule shadow-[var(--shadow-lift)] font-sans" } }
		})
	] });
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
