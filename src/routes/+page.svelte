<script lang="ts">
  import { onMount } from "svelte";
  import { save } from "@tauri-apps/plugin-dialog";
  import Editor from "$lib/Editor.svelte";
  import Calendar from "$lib/Calendar.svelte";
  import NoteList from "$lib/NoteList.svelte";
  import SearchBar from "$lib/SearchBar.svelte";
  import StatusBar from "$lib/StatusBar.svelte";
  import { notes, dates, ui } from "$lib/stores.svelte";
  import { api, localDay } from "$lib/ipc";

  let editorRef: { focus: () => void; flushSave: () => Promise<void> } | undefined = $state();

  const systemDark = $state(
    typeof window !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
  );
  const effectiveDark = $derived(ui.darkMode ?? systemDark);

  async function newNote() {
    await editorRef?.flushSave();
    const today = localDay(new Date());
    // jeśli user patrzy na dzisiaj — ok; jeśli na inny dzień, i tak
    // created_at = now() (zachowanie "nowa notatka dotyczy teraz")
    dates.selectedDay = today;
    dates.calendarDate = new Date();
    await notes.createAndLoad();
    await notes.refreshMonth(dates.year, dates.month);
    await notes.refreshDay(today);
    editorRef?.focus();
  }

  async function deleteCurrent() {
    const n = notes.current;
    if (!n) return;
    const ok = confirm("Usunąć tę notatkę? Tej operacji nie można cofnąć.");
    if (!ok) return;
    await api.deleteNote(n.id);
    await notes.refreshMonth(dates.year, dates.month);
    await notes.refreshDay(dates.selectedDay);
    if (notes.dayList.length > 0) {
      await notes.load(notes.dayList[notes.dayList.length - 1].id);
    } else {
      notes.current = null;
      await newNote();
    }
  }

  async function exportCurrent() {
    const n = notes.current;
    if (!n) return;
    await editorRef?.flushSave();
    const defaultName = `MM-DD_${localDay(new Date(n.created_at))}_${n.id}.md`;
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (path) {
      await api.exportNoteToMd(n.id, path);
    }
  }

  function onKey(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "n") {
      e.preventDefault();
      newNote();
    } else if (k === "f") {
      e.preventDefault();
      ui.searchOpen = true;
    } else if (k === "e") {
      e.preventDefault();
      exportCurrent();
    } else if (k === "t") {
      e.preventDefault();
      ui.toggleTimestamps();
    } else if (k === "delete" || e.key === "Delete") {
      e.preventDefault();
      deleteCurrent();
    }
  }

  onMount(async () => {
    await ui.loadFromMeta();
    await notes.refreshMonth(dates.year, dates.month);
    await notes.refreshDay(dates.selectedDay);
    if (notes.dayList.length > 0) {
      // załaduj ostatnią notatkę dnia, nie twórz nowej (welcome note się policzy)
      await notes.load(notes.dayList[notes.dayList.length - 1].id);
    } else {
      await newNote();
    }
  });
</script>

<svelte:window onkeydown={onKey} />

<main class:dark={effectiveDark}>
  <aside class="sidebar">
    <div class="brand">
      <span class="logo">MM.DD</span>
      <button type="button" class="new" onclick={newNote} title="Ctrl+N — nowa notatka">+ Nowa</button>
    </div>
    <Calendar />
    <NoteList />
  </aside>

  <section class="editor-pane">
    <Editor bind:this={editorRef} dark={effectiveDark} />
    <StatusBar />
  </section>

  <SearchBar />
</main>

<style>
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  :global(body) {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  main {
    /* Zmienne motywu — jasny domyślnie */
    --bg: #fcfcfc;
    --bg-2: #f3f3f3;
    --fg: #1a1a1a;
    --muted: #6b6b6b;
    --border: #e4e4e4;
    --hover: #ececec;
    --accent: #2f6feb;
    --accent-fg: #ffffff;

    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100vh;
    background: var(--bg);
    color: var(--fg);
  }

  main.dark {
    --bg: #18181b;
    --bg-2: #202024;
    --fg: #e6e6e6;
    --muted: #8b8b8b;
    --border: #2a2a2e;
    --hover: #26262b;
    --accent: #5b8def;
    --accent-fg: #ffffff;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    background: var(--bg-2);
    border-right: 1px solid var(--border);
    min-height: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid var(--border);
  }
  .logo {
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--fg);
  }
  .new {
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .new:hover {
    filter: brightness(1.1);
  }
  .editor-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
</style>
