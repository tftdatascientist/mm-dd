<script lang="ts">
  import { onMount } from "svelte";
  import { save } from "@tauri-apps/plugin-dialog";
  import Editor from "$lib/Editor.svelte";
  import FolderPanel from "$lib/FolderPanel.svelte";
  import FileList from "$lib/FileList.svelte";
  import SearchBar from "$lib/SearchBar.svelte";
  import StatusBar from "$lib/StatusBar.svelte";
  import { notes, dates, ui, folders } from "$lib/stores.svelte";
  import { api, localDay } from "$lib/ipc";

  let editorRef: { focus: () => void; flushSave: () => Promise<void> } | undefined = $state();

  const systemDark = $state(
    typeof window !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
  );
  const effectiveDark = $derived(ui.darkMode ?? systemDark);

  async function newNote() {
    await editorRef?.flushSave();
    const today = localDay(new Date());
    dates.selectedDay = today;
    dates.calendarDate = new Date();
    await notes.createAndLoad();
    await notes.refreshMonth(dates.year, dates.month);
    await notes.refreshDay(today);
    editorRef?.focus();
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
    if (k === "s") {
      e.preventDefault();
      editorRef?.flushSave();
    } else if (k === "f") {
      e.preventDefault();
      ui.searchOpen = true;
    } else if (k === "t") {
      e.preventDefault();
      ui.toggleTimestamps();
    }
  }

  onMount(async () => {
    await ui.loadFromMeta();
    await folders.loadFolders();
    await folders.loadAutosave();

    // Załaduj ostatnią notatkę jako fallback gdy brak pliku
    await notes.refreshMonth(dates.year, dates.month);
    await notes.refreshDay(dates.selectedDay);
    if (notes.dayList.length > 0) {
      await notes.load(notes.dayList[notes.dayList.length - 1].id);
    } else {
      await newNote();
    }

    // Jeśli jest zapisany folder — odśwież jego pliki
    if (folders.selectedFolder) {
      await folders.selectFolder(folders.selectedFolder);
    }
  });
</script>

<svelte:window onkeydown={onKey} />

<main class:dark={effectiveDark}>
  <aside class="sidebar">
    <div class="brand">
      <span class="logo">MM.DD</span>
    </div>
    <FolderPanel />
    <FileList />
  </aside>

  <section class="editor-pane">
    <Editor bind:this={editorRef} dark={effectiveDark} />
    <StatusBar onSave={() => editorRef?.flushSave()} />
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
    overflow: hidden;
  }
  .brand {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .logo {
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--fg);
  }
  .editor-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
</style>
