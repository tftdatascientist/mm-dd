<script lang="ts">
  import { open } from "@tauri-apps/plugin-dialog";
  import { folders } from "./stores.svelte";

  function folderName(path: string): string {
    return path.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? path;
  }

  async function addFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      await folders.addFolder(selected);
    }
  }

  async function removeFolder(path: string) {
    if (folders.selectedFolder === path) {
      const ok = confirm(`Usunąć folder z listy?\n${path}`);
      if (!ok) return;
    }
    await folders.removeFolder(path);
  }
</script>

<div class="folder-panel">
  <div class="header">
    <span class="label">FOLDERY</span>
    <button type="button" class="add-btn" onclick={addFolder} title="Dodaj folder">
      + Dodaj
    </button>
  </div>

  {#if folders.folders.length === 0}
    <div class="empty">
      <p>Brak folderów.</p>
      <button type="button" class="add-first" onclick={addFolder}>
        Dodaj pierwszy folder
      </button>
    </div>
  {:else}
    <ul class="list" role="list">
      {#each folders.folders as path (path)}
        <li role="listitem" class="row" class:selected={folders.selectedFolder === path}>
          <button
            type="button"
            class="item"
            onclick={() => folders.selectFolder(path)}
            title={path}
          >
            <span class="icon">▸</span>
            <span class="name">{folderName(path)}</span>
          </button>
          <button
            type="button"
            class="remove"
            onclick={() => removeFolder(path)}
            title="Usuń folder z listy"
            aria-label="Usuń folder"
          >×</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .folder-panel {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 6px;
    border-bottom: 1px solid var(--border);
  }
  .label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.8px;
    color: var(--muted);
    text-transform: uppercase;
  }
  .add-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.4;
  }
  .add-btn:hover {
    background: var(--hover);
    color: var(--fg);
  }
  .empty {
    padding: 16px 12px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
  }
  .empty p {
    margin: 0 0 8px;
  }
  .add-first {
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .add-first:hover {
    filter: brightness(1.1);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    max-height: 180px;
  }
  .row {
    display: flex;
    align-items: center;
    transition: background 0.1s;
  }
  .row:hover {
    background: var(--hover);
  }
  .row.selected {
    background: var(--accent);
  }
  .row.selected .item {
    color: var(--accent-fg);
  }
  .row.selected .remove {
    color: rgba(255, 255, 255, 0.6);
    opacity: 1;
  }
  .row.selected .remove:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    padding: 5px 4px 5px 12px;
    background: transparent;
    border: none;
    text-align: left;
    font-size: 13px;
    color: var(--fg);
    font-family: inherit;
    cursor: pointer;
  }
  .icon {
    font-size: 10px;
    flex-shrink: 0;
    opacity: 0.6;
  }
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  .remove {
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 14px;
    line-height: 1;
    padding: 4px 8px;
    cursor: pointer;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.1s;
  }
  .row:hover .remove {
    opacity: 1;
  }
  .remove:hover {
    background: var(--hover);
    color: var(--fg);
  }
</style>
