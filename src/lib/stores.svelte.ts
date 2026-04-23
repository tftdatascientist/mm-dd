import type { Note, NoteSummary, MdFileInfo } from "./ipc";
import { api, localDay } from "./ipc";

export interface FolderGroup {
  id: string;
  name: string;
  collapsed: boolean;
  folderPaths: string[];
}

/** Stan edytora / wybranej notatki */
class NoteStore {
  current = $state<Note | null>(null);
  saveStatus = $state<"idle" | "dirty" | "saving" | "saved">("idle");
  dayList = $state<NoteSummary[]>([]);
  monthDays = $state<Set<string>>(new Set());

  async load(id: number) {
    this.current = await api.getNote(id);
    this.saveStatus = "saved";
  }

  async createAndLoad() {
    const id = await api.createNote();
    await this.load(id);
    return id;
  }

  async refreshDay(day: string) {
    this.dayList = await api.listNotesForDay(day);
  }

  async refreshMonth(year: number, month: number) {
    const arr = await api.listDaysWithNotes(year, month);
    this.monthDays = new Set(arr);
  }
}

class DateStore {
  selectedDay = $state<string>(localDay(new Date()));
  calendarDate = $state<Date>(new Date());

  get year() {
    return this.calendarDate.getFullYear();
  }
  get month() {
    return this.calendarDate.getMonth() + 1;
  }

  prevMonth() {
    const d = new Date(this.calendarDate);
    d.setMonth(d.getMonth() - 1);
    this.calendarDate = d;
  }

  nextMonth() {
    const d = new Date(this.calendarDate);
    d.setMonth(d.getMonth() + 1);
    this.calendarDate = d;
  }

  today() {
    this.calendarDate = new Date();
    this.selectedDay = localDay(new Date());
  }
}

class UiStore {
  showTimestamps = $state<boolean>(false);
  darkMode = $state<boolean | null>(null);
  searchOpen = $state<boolean>(false);

  async loadFromMeta() {
    const ts = await api.getMeta("show_timestamps");
    if (ts !== null) this.showTimestamps = ts === "1";
    const dm = await api.getMeta("dark_mode");
    if (dm !== null) this.darkMode = dm === "1";
  }

  async toggleTimestamps() {
    this.showTimestamps = !this.showTimestamps;
    await api.setMeta("show_timestamps", this.showTimestamps ? "1" : "0");
  }

  async toggleDark() {
    if (this.darkMode === null) {
      this.darkMode = !matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      this.darkMode = !this.darkMode;
    }
    await api.setMeta("dark_mode", this.darkMode ? "1" : "0");
  }
}

class FolderStore {
  folders = $state<string[]>([]);
  aliases = $state<Record<string, string>>({});
  groups = $state<FolderGroup[]>([]);
  selectedFolder = $state<string | null>(null);
  files = $state<MdFileInfo[]>([]);
  selectedFile = $state<MdFileInfo | null>(null);
  fileContent = $state<string>("");
  /** Inkrementowany po każdym załadowaniu pliku — sygnał dla edytora */
  fileVersion = $state<number>(0);
  saveStatus = $state<"idle" | "dirty" | "saving" | "saved">("idle");
  autosave = $state<boolean>(false);

  async loadFolders() {
    this.folders = await api.listFolders();
    await Promise.all([this.loadAliases(), this.loadGroups()]);
    const last = await api.getMeta("last_folder");
    if (last && this.folders.includes(last)) {
      this.selectedFolder = last;
    }
  }

  async loadAliases() {
    const json = await api.getMeta("folder_aliases");
    if (json) {
      try { this.aliases = JSON.parse(json); } catch { this.aliases = {}; }
    }
  }

  async setAlias(path: string, alias: string) {
    const trimmed = alias.trim();
    const updated = { ...this.aliases };
    if (trimmed) {
      updated[path] = trimmed;
    } else {
      delete updated[path];
    }
    this.aliases = updated;
    await api.setMeta("folder_aliases", JSON.stringify(this.aliases));
  }

  // ── Grupy ────────────────────────────────────────────────────────────────

  async loadGroups() {
    const json = await api.getMeta("folder_groups");
    if (json) {
      try { this.groups = JSON.parse(json); } catch { this.groups = []; }
    }
  }

  async saveGroups() {
    await api.setMeta("folder_groups", JSON.stringify(this.groups));
  }

  async createGroup(name: string, folderPath: string) {
    const id = `g_${Date.now()}`;
    // Usuń folder z innych grup
    this.groups = this.groups.map(g => ({
      ...g,
      folderPaths: g.folderPaths.filter(p => p !== folderPath),
    }));
    this.groups = [...this.groups, { id, name, collapsed: false, folderPaths: [folderPath] }];
    await this.saveGroups();
  }

  async addToGroup(groupId: string, folderPath: string) {
    this.groups = this.groups.map(g => {
      if (g.id === groupId) {
        if (g.folderPaths.includes(folderPath)) return g;
        return { ...g, folderPaths: [...g.folderPaths, folderPath] };
      }
      return { ...g, folderPaths: g.folderPaths.filter(p => p !== folderPath) };
    });
    await this.saveGroups();
  }

  async removeFromGroup(folderPath: string) {
    this.groups = this.groups.map(g => ({
      ...g,
      folderPaths: g.folderPaths.filter(p => p !== folderPath),
    }));
    await this.saveGroups();
  }

  async renameGroup(groupId: string, name: string) {
    this.groups = this.groups.map(g => g.id === groupId ? { ...g, name } : g);
    await this.saveGroups();
  }

  async deleteGroup(groupId: string) {
    this.groups = this.groups.filter(g => g.id !== groupId);
    await this.saveGroups();
  }

  async toggleGroupCollapsed(groupId: string) {
    this.groups = this.groups.map(g =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
    );
    await this.saveGroups();
  }

  // ── Foldery ───────────────────────────────────────────────────────────────

  async addFolder(path: string) {
    await api.addFolder(path);
    if (!this.folders.includes(path)) {
      this.folders = [...this.folders, path];
    }
    await this.selectFolder(path);
  }

  async removeFolder(path: string) {
    await api.removeFolder(path);
    this.folders = this.folders.filter((f) => f !== path);
    if (this.aliases[path]) await this.setAlias(path, "");
    // Wyczyść z grup
    const inGroup = this.groups.some(g => g.folderPaths.includes(path));
    if (inGroup) {
      this.groups = this.groups.map(g => ({
        ...g,
        folderPaths: g.folderPaths.filter(p => p !== path),
      }));
      await this.saveGroups();
    }
    if (this.selectedFolder === path) {
      this.selectedFolder = null;
      this.files = [];
      this.selectedFile = null;
      this.fileContent = "";
      this.saveStatus = "idle";
      await api.setMeta("last_folder", "");
    }
  }

  async selectFolder(path: string) {
    this.selectedFolder = path;
    this.selectedFile = null;
    this.fileContent = "";
    this.saveStatus = "idle";
    this.files = await api.listMdFiles(path);
    await api.setMeta("last_folder", path);
  }

  async selectFile(file: MdFileInfo) {
    this.selectedFile = file;
    this.saveStatus = "idle";
    const content = await api.readFile(file.path);
    this.fileContent = content;
    this.fileVersion += 1;
  }

  async save(content: string) {
    if (!this.selectedFile) return;
    this.saveStatus = "saving";
    try {
      await api.writeFile(this.selectedFile.path, content);
      this.fileContent = content;
      this.saveStatus = "saved";
    } catch (err) {
      console.error("file save error:", err);
      this.saveStatus = "dirty";
    }
  }

  async loadAutosave() {
    const v = await api.getMeta("folder_autosave");
    if (v !== null) this.autosave = v === "1";
  }

  async toggleAutosave() {
    this.autosave = !this.autosave;
    await api.setMeta("folder_autosave", this.autosave ? "1" : "0");
  }
}

export const notes = new NoteStore();
export const dates = new DateStore();
export const ui = new UiStore();
export const folders = new FolderStore();
