import { invoke } from "@tauri-apps/api/core";

export interface Note {
  id: number;
  created_at: string; // ISO8601 UTC
  updated_at: string;
  content: string;
}

export interface NoteSummary {
  id: number;
  created_at: string;
  snippet: string;
}

export interface SearchHit {
  id: number;
  created_at: string;
  snippet_html: string;
}

export interface MdFileInfo {
  name: string;
  path: string;
  priority_index: number; // -1 = zwykły; 0+ = priorytetowy
}

export const api = {
  createNote: () => invoke<number>("create_note"),
  updateNote: (id: number, content: string) =>
    invoke<void>("update_note", { id, content }),
  deleteNote: (id: number) => invoke<void>("delete_note", { id }),
  getNote: (id: number) => invoke<Note>("get_note", { id }),
  listNotesForDay: (day: string) =>
    invoke<NoteSummary[]>("list_notes_for_day", { day }),
  listDaysWithNotes: (year: number, month: number) =>
    invoke<string[]>("list_days_with_notes", { year, month }),
  searchNotes: (query: string, limit = 30) =>
    invoke<SearchHit[]>("search_notes", { query, limit }),
  exportNoteToMd: (id: number, path: string) =>
    invoke<void>("export_note_to_md", { id, path }),
  getMeta: (key: string) => invoke<string | null>("get_meta", { key }),
  setMeta: (key: string, value: string) =>
    invoke<void>("set_meta", { key, value }),
  countWords: (content: string) => invoke<number>("count_words", { content }),
  // folder browser
  listFolders: () => invoke<string[]>("list_folders"),
  addFolder: (path: string) => invoke<void>("add_folder", { path }),
  removeFolder: (path: string) => invoke<void>("remove_folder", { path }),
  listMdFiles: (folder: string) => invoke<MdFileInfo[]>("list_md_files", { folder }),
  readFile: (path: string) => invoke<string>("read_file", { path }),
  writeFile: (path: string, content: string) =>
    invoke<void>("write_file", { path, content }),
  createMdFile: (folder: string, name: string) =>
    invoke<string>("create_md_file", { folder, name }),
};

/** ISO8601 UTC -> "YYYY-MM-DD" w lokalnej strefie */
export function toLocalDay(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO8601 UTC -> "HH:MM" w lokalnej strefie */
export function toLocalTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

/** "YYYY-MM-DD" w lokalnej strefie dla daty */
export function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Polski format daty dla nagłówka kalendarza */
export function formatMonthHeader(d: Date): string {
  return d.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
}

/** Polski format dnia dla nagłówka listy notatek */
export function formatDayHeader(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
