import { o as Node } from "./@tiptap/core+[...].mjs";
//#region node_modules/@tiptap/extension-document/dist/index.js
/**
* The default document node which represents the top level node of the editor.
* @see https://tiptap.dev/api/nodes/document
*/
var Document = Node.create({
	name: "doc",
	topNode: true,
	content: "block+",
	renderMarkdown: (node, h) => {
		if (!node.content) return "";
		return h.renderChildren(node.content, "\n\n");
	}
});
//#endregion
export { Document as t };
