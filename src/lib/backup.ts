import { unzip, zipStore } from "./zip";
import { saveFile } from "./native";
import type { Note, Notebook, Prefs } from "./types";

export type BackupPayload = {
  app: "quire";
  version: 1;
  exportedAt: string;
  notebooks: Notebook[];
  notes: Note[];
  prefs: Prefs;
};

export function buildBackup(notebooks: Notebook[], notes: Note[], prefs: Prefs): BackupPayload {
  return {
    app: "quire",
    version: 1,
    exportedAt: new Date().toISOString(),
    notebooks,
    notes,
    prefs,
  };
}

export async function backupBlob(payload: BackupPayload) {
  const json = JSON.stringify(payload, null, 2);
  return zipStore([{ name: "quire.json", data: new TextEncoder().encode(json) }]);
}

export function backupFilename() {
  const day = new Date().toISOString().slice(0, 10);
  return `Quire-backup-${day}.zip`;
}

export async function saveBackup(payload: BackupPayload) {
  const blob = await backupBlob(payload);
  await saveFile(backupFilename(), blob);
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  if (file.name.endsWith(".json") || file.type.includes("json")) {
    return parseBackup(await file.text());
  }
  const files = await unzip(await file.arrayBuffer());
  const json = files.get("quire.json") || [...files.values()][0];
  if (!json) throw new Error("That zip has no Quire backup inside.");
  return parseBackup(json);
}

function parseBackup(text: string): BackupPayload {
  const data = JSON.parse(text) as BackupPayload;
  if (!data || data.app !== "quire" || !Array.isArray(data.notebooks) || !Array.isArray(data.notes)) {
    throw new Error("That file is not a Quire backup.");
  }
  return data;
}
