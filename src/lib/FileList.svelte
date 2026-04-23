<script lang="ts">
  import type { MdFileInfo } from "./ipc";
  import { api } from "./ipc";
  import { folders } from "./stores.svelte";

  function shortPath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  const priorityFiles = $derived(folders.files.filter((f) => f.priority_index >= 0));
  const regularFiles = $derived(folders.files.filter((f) => f.priority_index < 0));
  const hasBoth = $derived(priorityFiles.length > 0 && regularFiles.length > 0);

  function isSelected(f: MdFileInfo): boolean {
    return folders.selectedFile?.path === f.path;
  }

  function isRoadmap(f: MdFileInfo): boolean {
    return f.name.toLowerCase() === "roadmap.md";
  }

  // nowy plik
  let creatingFile = $state(false);
  let newFileName = $state("");
  let createError = $state<string | null>(null);
  let inputEl = $state<HTMLInputElement | undefined>();

  function startCreate() {
    creatingFile = true;
    newFileName = "";
    createError = null;
  }

  function cancelCreate() {
    creatingFile = false;
    createError = null;
  }

  async function confirmCreate() {
    const name = newFileName.trim();
    if (!name) return;
    createError = null;
    try {
      await api.createMdFile(folders.selectedFolder!, name);
      await folders.selectFolder(folders.selectedFolder!);
      creatingFile = false;
    } catch (err) {
      createError = String(err);
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter") confirmCreate();
    if (e.key === "Escape") cancelCreate();
  }

  $effect(() => {
    if (creatingFile && inputEl) inputEl.focus();
  });
</script>

{#if folders.selectedFolder}
  <div class="file-list">
    <div class="folder-path" title={folders.selectedFolder}>
      {shortPath(folders.selectedFolder)}
    </div>

    <div class="toolbar">
      {#if !creatingFile}
        <button type="button" class="new-btn" onclick={startCreate} title="Nowy plik .md">
          + Nowy plik
        </button>
      {:else}
        <div class="new-file-row">
          <input
            bind:this={inputEl}
            bind:value={newFileName}
            class="new-file-input"
            placeholder="nazwa-pliku.md"
            onkeydown={handleKey}
          />
          <button type="button" class="btn-ok" onclick={confirmCreate} title="Utwórz">✓</button>
          <button type="button" class="btn-cancel" onclick={cancelCreate} title="Anuluj">✗</button>
        </div>
        {#if createError}
          <div class="create-error">{createError}</div>
        {/if}
      {/if}
    </div>

    {#if folders.files.length === 0}
      <div class="empty">Brak plików .md</div>
    {:else}
      <ul class="list" role="list">
        {#each priorityFiles as file (file.path)}
          <li role="listitem">
            <button
              type="button"
              class="item"
              class:priority={!isRoadmap(file)}
              class:roadmap={isRoadmap(file)}
              class:selected={isSelected(file)}
              onclick={() => folders.selectFile(file)}
              title={file.path}
            >
              {file.name}
            </button>
          </li>
        {/each}

        {#if hasBoth}
          <li class="separator" aria-hidden="true"></li>
        {/if}

        {#each regularFiles as file (file.path)}
          <li role="listitem">
            <button
              type="button"
              class="item"
              class:selected={isSelected(file)}
              onclick={() => folders.selectFile(file)}
              title={file.path}
            >
              {file.name}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .file-list {
    display: flex;
    flex-direction: column;
    flex: 2;
    min-height: 80px;
    overflow: hidden;
  }
  .folder-path {
    padding: 6px 12px;
    font-size: 10px;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    direction: rtl;
    text-align: left;
    flex-shrink: 0;
  }
  .toolbar {
    padding: 5px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .new-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  .new-btn:hover {
    background: var(--hover);
    color: var(--fg);
  }
  .new-file-row {
    display: flex;
    gap: 3px;
    align-items: center;
  }
  .new-file-input {
    flex: 1;
    font-size: 12px;
    font-family: inherit;
    padding: 3px 6px;
    border: 1px solid var(--accent);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    outline: none;
    min-width: 0;
  }
  .btn-ok,
  .btn-cancel {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 13px;
    padding: 2px 5px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .btn-ok:hover { color: #27ae60; }
  .btn-cancel:hover { color: #e74c3c; }
  .create-error {
    font-size: 10px;
    color: #c0392b;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    padding: 12px;
    font-size: 12px;
    color: var(--muted);
    text-align: center;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    flex: 1;
  }
  .list li {
    margin: 0;
    padding: 0;
  }
  .item {
    display: block;
    width: 100%;
    padding: 5px 12px;
    font-size: 13px;
    cursor: pointer;
    color: var(--fg);
    background: transparent;
    border: none;
    text-align: left;
    font-family: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
    transition: background 0.1s;
  }
  .item:hover {
    background: var(--hover);
  }
  .item.selected {
    background: var(--hover);
    font-weight: 500;
  }
  .item.priority {
    color: var(--file-priority);
  }
  .item.priority.selected {
    background: color-mix(in srgb, var(--file-priority) 12%, transparent);
  }
  .item.roadmap {
    color: var(--file-roadmap);
    font-weight: 600;
  }
  .item.roadmap.selected {
    background: color-mix(in srgb, var(--file-roadmap) 12%, transparent);
  }
  .separator {
    height: 1px;
    background: var(--border);
    margin: 4px 12px;
  }

  :global(main) .file-list {
    --file-priority: #7a5500;
    --file-roadmap: #1a6b3a;
  }
  :global(main.dark) .file-list {
    --file-priority: #c9a84c;
    --file-roadmap: #4caf72;
  }
</style>
