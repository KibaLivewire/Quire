export type EditorCommand =
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "selectAll"
  | "bold"
  | "italic"
  | "underline";

type Handler = (command: EditorCommand) => boolean;

const handlers = new Set<Handler>();

export function registerEditorCommands(handler: Handler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function runEditorCommand(command: EditorCommand) {
  for (const handler of [...handlers].reverse()) {
    if (handler(command)) return true;
  }
  return false;
}
