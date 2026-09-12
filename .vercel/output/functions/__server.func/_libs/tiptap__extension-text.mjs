import { o as Node } from "./@tiptap/core+[...].mjs";
//#region node_modules/@tiptap/extension-text/dist/index.js
/**
* This extension allows you to create text nodes.
* @see https://www.tiptap.dev/api/nodes/text
*/
var Text = Node.create({
	name: "text",
	group: "inline",
	parseMarkdown: (token) => {
		return {
			type: "text",
			text: token.text || ""
		};
	},
	renderMarkdown: (node) => node.text || ""
});
//#endregion
export { Text as t };
