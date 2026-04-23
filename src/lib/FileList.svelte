<script lang="ts">
  import type { MdFileInfo } from "./ipc";
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
</script>

{#if folders.selectedFolder}
  <div class="file-list">
    <div class="folder-path" title={folders.selectedFolder}>
      {shortPath(folders.selectedFolder)}
    </div>

    {#if folders.files.length === 0}
      <div class="empty">Brak plików .md</div>
    {:else}
      <ul class="list" role="list">
        {#each priorityFiles as file (file.path)}
          <li role="listitem">
            <button
              type="button"
              class="item priority"
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
    flex: 1;
    min-height: 0;
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
  .separator {
    height: 1px;
    background: var(--border);
    margin: 4px 12px;
  }

  :global(main) .file-list {
    --file-priority: #7a5500;
  }
  :global(main.dark) .file-list {
    --file-priority: #c9a84c;
  }
</style>
