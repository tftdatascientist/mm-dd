<script lang="ts">
  import { onMount, onDestroy, untrack } from "svelte";
  import { EditorState } from "@codemirror/state";
  import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { markdown } from "@codemirror/lang-markdown";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
  import { notes, folders } from "./stores.svelte";
  import { api } from "./ipc";

  interface Props {
    dark: boolean;
  }
  let { dark }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let view: EditorView | null = null;
  let currentId: number | null = null;
  let currentFilePath: string | null = null;
  let saveTimer: number | null = null;
  let pendingContent: string | null = null;

  const SAVE_DEBOUNCE_MS = 500;

  async function flushSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (pendingContent !== null) {
      const content = pendingContent;
      pendingContent = null;

      if (currentFilePath !== null) {
        await folders.save(content);
      } else if (currentId !== null) {
        const id = currentId;
        notes.saveStatus = "saving";
        try {
          await api.updateNote(id, content);
          if (notes.current && notes.current.id === id) {
            notes.current = { ...notes.current, content, updated_at: new Date().toISOString() };
          }
          notes.saveStatus = "saved";
        } catch (err) {
          console.error("save error:", err);
          notes.saveStatus = "dirty";
        }
      }
    }
  }

  function scheduleSave(content: string) {
    pendingContent = content;

    if (currentFilePath !== null) {
      folders.saveStatus = "dirty";
      if (folders.autosave) {
        if (saveTimer !== null) clearTimeout(saveTimer);
        saveTimer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
      }
    } else {
      notes.saveStatus = "dirty";
      if (saveTimer !== null) clearTimeout(saveTimer);
      saveTimer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    }
  }

  function buildState(doc: string): EditorState {
    const exts = [
      lineNumbers(),
      history(),
      bracketMatching(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          scheduleSave(u.state.doc.toString());
        }
      }),
      EditorView.domEventHandlers({
        blur: () => {
          if (currentFilePath === null || folders.autosave) {
            flushSave();
          }
          return false;
        },
      }),
    ];
    if (dark) exts.push(oneDark);
    return EditorState.create({ doc, extensions: exts });
  }

  // Tryb notatkowy — ładuje notatkę z bazy gdy nie ma wybranego pliku
  $effect(() => {
    const note = notes.current;
    const file = folders.selectedFile;
    if (!view || !note || file !== null) return;
    if (note.id === currentId) return;
    flushSave();
    currentId = note.id;
    currentFilePath = null;
    view.setState(buildState(note.content));
    view.focus();
  });

  // Tryb plikowy — ładuje plik z dysku gdy fileVersion się zmieni (po async read)
  // fileContent czytamy przez untrack żeby auto-save nie resetował kursora
  $effect(() => {
    const ver = folders.fileVersion;
    const file = folders.selectedFile;
    void ver;
    if (!view || !file) return;
    const content = untrack(() => folders.fileContent);
    flushSave();
    currentFilePath = file.path;
    currentId = null;
    view.setState(buildState(content));
    view.focus();
  });

  // Przebuduj theme gdy zmieni się dark mode
  $effect(() => {
    if (!view) return;
    const doc = view.state.doc.toString();
    void dark;
    view.setState(buildState(doc));
  });

  onMount(() => {
    if (!container) return;
    view = new EditorView({
      state: buildState(notes.current?.content ?? ""),
      parent: container,
    });
    currentId = notes.current?.id ?? null;
    view.focus();
    window.addEventListener("beforeunload", flushSave);
  });

  onDestroy(() => {
    flushSave();
    window.removeEventListener("beforeunload", flushSave);
    view?.destroy();
    view = null;
  });

  export function focus() {
    view?.focus();
  }
  export { flushSave };
</script>

<div class="editor" bind:this={container}></div>

<style>
  .editor {
    height: 100%;
    width: 100%;
    display: flex;
    overflow: hidden;
  }
  .editor :global(.cm-editor) {
    height: 100%;
    width: 100%;
    font-family: "JetBrains Mono", ui-monospace, Consolas, "Courier New", monospace;
    font-size: 14px;
    line-height: 1.6;
  }
  .editor :global(.cm-scroller) {
    padding: 16px 24px;
  }
  .editor :global(.cm-content) {
    caret-color: var(--accent);
  }
  .editor :global(.cm-gutters) {
    border-right: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
  }
</style>
