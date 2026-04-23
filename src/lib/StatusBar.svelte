<script lang="ts">
  import { notes, folders, ui } from "./stores.svelte";
  import { toLocalTime, toLocalDay } from "./ipc";

  interface Props {
    onSave?: () => void;
  }
  let { onSave }: Props = $props();

  const isFileMode = $derived(folders.selectedFile !== null);

  // Status i liczniki dla trybu plikowego
  const fileStatus = $derived.by(() => {
    switch (folders.saveStatus) {
      case "saving": return "Zapisuję…";
      case "dirty":  return "Edytowane";
      case "saved":  return "Zapisano";
      default:       return "—";
    }
  });

  // Status i liczniki dla trybu notatkowego
  const noteStatus = $derived.by(() => {
    switch (notes.saveStatus) {
      case "saving": return "Zapisuję…";
      case "dirty":  return "Edytowane";
      case "saved":  return "Zapisano";
      default:       return "—";
    }
  });

  const status = $derived(isFileMode ? fileStatus : noteStatus);
  const isDirty = $derived(
    isFileMode
      ? folders.saveStatus === "dirty"
      : notes.saveStatus === "dirty"
  );

  const wordCount = $derived.by(() => {
    const c = isFileMode ? folders.fileContent : (notes.current?.content ?? "");
    return c.split(/\s+/).filter(Boolean).length;
  });

  const charCount = $derived.by(() =>
    isFileMode ? folders.fileContent.length : (notes.current?.content.length ?? 0)
  );

  const infoText = $derived.by(() => {
    if (isFileMode) {
      return folders.selectedFile?.name ?? "";
    }
    if (!notes.current) return "";
    const day = toLocalDay(notes.current.created_at);
    const time = toLocalTime(notes.current.created_at);
    return `${day} · ${time}`;
  });
</script>

<footer>
  <span class="info" title={isFileMode ? folders.selectedFile?.path : undefined}>
    {infoText}
  </span>

  <span class="stats">
    <span>{wordCount} słów</span>
    <span class="sep">·</span>
    <span>{charCount} znaków</span>
  </span>

  <span class="status" class:dirty={isDirty}>{status}</span>

  {#if isFileMode}
    <button
      type="button"
      class="toggle autosave"
      class:active={folders.autosave}
      onclick={() => folders.toggleAutosave()}
      title="Włącz/wyłącz auto-zapis przy edycji"
    >
      {folders.autosave ? "Auto-zapis: on" : "Auto-zapis: off"}
    </button>
    <button
      type="button"
      class="save-btn"
      onclick={onSave}
      title="Zapisz plik (Ctrl+S)"
      disabled={folders.saveStatus !== "dirty"}
    >
      Zapisz
    </button>
  {:else}
    <button
      type="button"
      class="toggle"
      onclick={() => ui.toggleTimestamps()}
      title="Ctrl+T — pokaż/ukryj godziny"
    >
      {ui.showTimestamps ? "Godziny: on" : "Godziny: off"}
    </button>
  {/if}

  <button
    type="button"
    class="toggle"
    onclick={() => ui.toggleDark()}
    title="Przełącz tryb ciemny"
  >
    {#if ui.darkMode === true}
      ◐ Ciemny
    {:else if ui.darkMode === false}
      ◑ Jasny
    {:else}
      ◒ Auto
    {/if}
  </button>
</footer>

<style>
  footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
    background: var(--bg);
    height: 28px;
    flex-shrink: 0;
  }
  .info {
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 240px;
    flex-shrink: 0;
  }
  .stats {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
  .sep {
    opacity: 0.5;
  }
  .status {
    color: var(--muted);
    white-space: nowrap;
  }
  .status.dirty {
    color: var(--accent);
  }
  .toggle {
    background: transparent;
    border: 1px solid transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .toggle:hover {
    background: var(--hover);
    color: var(--fg);
  }
  .autosave.active {
    border-color: var(--border);
    color: var(--fg);
  }
  .save-btn {
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    font-size: 11px;
    padding: 2px 10px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .save-btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  .save-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
