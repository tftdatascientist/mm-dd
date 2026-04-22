<script lang="ts">
  import { notes, ui } from "./stores.svelte";
  import { toLocalTime, toLocalDay } from "./ipc";

  const status = $derived.by(() => {
    switch (notes.saveStatus) {
      case "saving":
        return "Zapisuję…";
      case "dirty":
        return "Edytowane";
      case "saved":
        return "Zapisano";
      default:
        return "—";
    }
  });

  const wordCount = $derived.by(() => {
    const c = notes.current?.content ?? "";
    return c.split(/\s+/).filter(Boolean).length;
  });

  const charCount = $derived.by(() => notes.current?.content.length ?? 0);

  const noteInfo = $derived.by(() => {
    if (!notes.current) return "";
    const day = toLocalDay(notes.current.created_at);
    const time = toLocalTime(notes.current.created_at);
    return `${day} · ${time}`;
  });
</script>

<footer>
  <span class="info">{noteInfo}</span>
  <span class="stats">
    <span>{wordCount} słów</span>
    <span class="sep">·</span>
    <span>{charCount} znaków</span>
  </span>
  <span class="status" class:dirty={notes.saveStatus === "dirty"}>{status}</span>
  <button
    type="button"
    class="toggle"
    onclick={() => ui.toggleTimestamps()}
    title="Ctrl+T — pokaż/ukryj godziny"
  >
    {ui.showTimestamps ? "Godziny: on" : "Godziny: off"}
  </button>
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
    gap: 12px;
    padding: 4px 12px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
    background: var(--bg);
    height: 24px;
    flex-shrink: 0;
  }
  .info {
    font-variant-numeric: tabular-nums;
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
  }
  .toggle:hover {
    background: var(--hover);
    color: var(--fg);
  }
</style>
