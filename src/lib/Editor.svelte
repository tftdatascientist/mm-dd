<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorState } from "@codemirror/state";
  import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { markdown } from "@codemirror/lang-markdown";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
  import { notes } from "./stores.svelte";
  import { api } from "./ipc";

  interface Props {
    dark: boolean;
  }
  let { dark }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let view: EditorView | null = null;
  let currentId: number | null = null;
  let saveTimer: number | null = null;
  let pendingContent: string | null = null;

  const SAVE_DEBOUNCE_MS = 500;

  async function flushSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (pendingContent !== null && currentId !== null) {
      const content = pendingContent;
      const id = currentId;
      pendingContent = null;
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

  function scheduleSave(content: string) {
    pendingContent = content;
    notes.saveStatus = "dirty";
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
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
          flushSave();
          return false;
        },
      }),
    ];
    if (dark) exts.push(oneDark);
    return EditorState.create({ doc, extensions: exts });
  }

  // Reaguj na zmianę notes.current — przeładuj editor
  $effect(() => {
    const note = notes.current;
    if (!view || !note) return;
    if (note.id === currentId) return;
    // zapisz poprzednią zanim przełączysz
    flushSave();
    currentId = note.id;
    view.setState(buildState(note.content));
    view.focus();
  });

  // Reaguj na zmianę darkmode
  $effect(() => {
    // odtwórz state by wymienić theme
    if (!view) return;
    const doc = view.state.doc.toString();
    // no-op jeśli to samo
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
