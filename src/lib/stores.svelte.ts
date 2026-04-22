import type { Note, NoteSummary } from "./ipc";
import { api, localDay } from "./ipc";

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
  darkMode = $state<boolean | null>(null); // null = system
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

export const notes = new NoteStore();
export const dates = new DateStore();
export const ui = new UiStore();
