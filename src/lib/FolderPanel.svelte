<script lang="ts">
  import { open } from "@tauri-apps/plugin-dialog";
  import { api } from "./ipc";
  import { folders } from "./stores.svelte";

  // ── Stan ──────────────────────────────────────────────────────────────────
  let error = $state<string | null>(null);
  let editingPath = $state<string | null>(null);
  let editValue = $state("");
  let editInputEl = $state<HTMLInputElement | undefined>();

  type FolderCtx = { x: number; y: number; folder: string; inGroup: boolean };
  type GroupCtx  = { x: number; y: number; groupId: string };
  let ctxMenu   = $state<FolderCtx | null>(null);
  let groupCtx  = $state<GroupCtx | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  const groupOf = $derived(
    Object.fromEntries(
      folders.groups.flatMap(g => g.folderPaths.map(p => [p, g.id]))
    )
  );
  const ungroupedFolders = $derived(
    folders.folders.filter(p => !groupOf[p])
  );

  $effect(() => {
    if (editingPath !== null && editInputEl) editInputEl.focus();
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function folderName(path: string): string {
    return path.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? path;
  }

  function roadmapExists(folder: string): boolean {
    return folders.selectedFolder === folder &&
      folders.files.some(f => f.name.toLowerCase() === "roadmap.md");
  }

  // ── Dodaj folder ──────────────────────────────────────────────────────────
  async function addFolder() {
    error = null;
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string" && selected) {
        await folders.addFolder(selected);
      }
    } catch (err) {
      error = String(err);
      console.error("addFolder:", err);
    }
  }

  async function removeFolder(path: string) {
    const ok = confirm(`Usunąć folder z listy?\n${path}`);
    if (!ok) return;
    try {
      await folders.removeFolder(path);
    } catch (err) {
      error = String(err);
    }
  }

  // ── Alias ─────────────────────────────────────────────────────────────────
  function startEdit(e: MouseEvent, path: string) {
    e.stopPropagation();
    editingPath = path;
    editValue = folders.aliases[path] ?? "";
  }

  async function confirmEdit() {
    if (editingPath === null) return;
    await folders.setAlias(editingPath, editValue);
    editingPath = null;
  }

  function cancelEdit() { editingPath = null; }

  function handleEditKey(e: KeyboardEvent) {
    if (e.key === "Enter") confirmEdit();
    if (e.key === "Escape") cancelEdit();
  }

  // ── Folder context menu ───────────────────────────────────────────────────
  function onContextMenu(e: MouseEvent, path: string) {
    e.preventDefault();
    groupCtx = null;
    ctxMenu = { x: e.clientX, y: e.clientY, folder: path, inGroup: !!groupOf[path] };
  }

  function closeCtx() { ctxMenu = null; groupCtx = null; }

  async function createRoadmap() {
    if (!ctxMenu) return;
    const folder = ctxMenu.folder;
    ctxMenu = null;
    try {
      await api.createMdFile(folder, "ROADMAP.md");
      if (folders.selectedFolder === folder) await folders.selectFolder(folder);
    } catch (err) {
      error = String(err);
    }
  }

  // ── Grupy — operacje ──────────────────────────────────────────────────────
  async function newGroupWithFolder(path: string) {
    ctxMenu = null;
    const name = prompt("Nazwa nowej grupy:");
    if (name?.trim()) {
      try { await folders.createGroup(name.trim(), path); }
      catch (err) { error = String(err); }
    }
  }

  async function assignToGroup(groupId: string, path: string) {
    ctxMenu = null;
    await folders.addToGroup(groupId, path);
  }

  async function removeFromGroup(path: string) {
    ctxMenu = null;
    await folders.removeFromGroup(path);
  }

  // ── Group context menu ────────────────────────────────────────────────────
  function onGroupCtx(e: MouseEvent, groupId: string) {
    e.preventDefault();
    ctxMenu = null;
    groupCtx = { x: e.clientX, y: e.clientY, groupId };
  }

  async function renameGroup(groupId: string) {
    groupCtx = null;
    const g = folders.groups.find(g => g.id === groupId);
    if (!g) return;
    const name = prompt("Nowa nazwa grupy:", g.name);
    if (name?.trim()) await folders.renameGroup(groupId, name.trim());
  }

  async function deleteGroup(groupId: string) {
    groupCtx = null;
    const ok = confirm("Usunąć grupę? Foldery pozostaną na liście.");
    if (ok) await folders.deleteGroup(groupId);
  }
</script>

<!-- ── Snippet: wiersz folderu ─────────────────────────────────────────── -->
{#snippet folderRow(path: string, indented: boolean)}
  <li
    role="listitem"
    class="row"
    class:indented
    class:selected={folders.selectedFolder === path}
    oncontextmenu={(e) => onContextMenu(e, path)}
  >
    {#if editingPath === path}
      <div class="alias-edit">
        <input
          bind:this={editInputEl}
          class="alias-input"
          bind:value={editValue}
          placeholder="Wpisz nazwę…"
          onkeydown={handleEditKey}
        />
        <button type="button" class="edit-confirm" onclick={confirmEdit} title="Zatwierdź">✓</button>
        <button type="button" class="edit-cancel" onclick={cancelEdit} title="Anuluj">✗</button>
      </div>
    {:else}
      <button
        type="button"
        class="item"
        onclick={() => folders.selectFolder(path)}
        title={path}
      >
        <span class="icon">▸</span>
        <span class="names">
          {#if folders.aliases[path]}
            <span class="alias">{folders.aliases[path]}</span>
            <span class="foldername">{folderName(path)}</span>
          {:else}
            <span class="name">{folderName(path)}</span>
          {/if}
        </span>
      </button>
      <button
        type="button"
        class="btn-alias"
        onclick={(e) => startEdit(e, path)}
        title="Nadaj nazwę"
      >✎</button>
      <button
        type="button"
        class="remove"
        onclick={() => removeFolder(path)}
        title="Usuń folder z listy"
        aria-label="Usuń folder"
      >×</button>
    {/if}
  </li>
{/snippet}

<!-- ── Główny panel ────────────────────────────────────────────────────── -->
<div class="folder-panel">
  <div class="header">
    <span class="label">FOLDERY</span>
    <button type="button" class="add-btn" onclick={addFolder} title="Dodaj folder">
      + Dodaj
    </button>
  </div>

  {#if error}
    <div class="error" title={error}>{error}</div>
  {/if}

  <ul class="list" role="list">
    {#if folders.folders.length === 0}
      <li class="empty">
        <p>Brak folderów.</p>
        <button type="button" class="add-first" onclick={addFolder}>
          Dodaj pierwszy folder
        </button>
      </li>
    {:else}
      <!-- Niegrupowane foldery -->
      {#each ungroupedFolders as path (path)}
        {@render folderRow(path, false)}
      {/each}

      <!-- Grupy -->
      {#each folders.groups as group (group.id)}
        <li
          class="group-header"
          role="listitem"
          oncontextmenu={(e) => onGroupCtx(e, group.id)}
        >
          <button
            type="button"
            class="group-toggle"
            onclick={() => folders.toggleGroupCollapsed(group.id)}
            title={group.collapsed ? "Rozwiń" : "Zwiń"}
          >
            {group.collapsed ? "▶" : "▼"}
          </button>
          <span class="group-name">{group.name}</span>
          <span class="group-count">{group.folderPaths.filter(p => folders.folders.includes(p)).length}</span>
        </li>

        {#if !group.collapsed}
          {#each group.folderPaths.filter(p => folders.folders.includes(p)) as path (path)}
            {@render folderRow(path, true)}
          {/each}
        {/if}
      {/each}
    {/if}
  </ul>
</div>

<!-- ── Context menu: folder ───────────────────────────────────────────── -->
{#if ctxMenu}
  <div class="ctx-overlay" role="presentation" onclick={closeCtx} oncontextmenu={(e) => { e.preventDefault(); closeCtx(); }}></div>
  <div class="ctx-menu" style="left:{ctxMenu.x}px; top:{ctxMenu.y}px">
    <button type="button" class="ctx-item" onclick={() => newGroupWithFolder(ctxMenu!.folder)}>
      📁 Nowa grupa z tym folderem
    </button>
    {#each folders.groups as g (g.id)}
      <button
        type="button"
        class="ctx-item ctx-sub"
        onclick={() => assignToGroup(g.id, ctxMenu!.folder)}
        disabled={g.folderPaths.includes(ctxMenu.folder)}
      >
        → {g.name}
      </button>
    {/each}
    {#if ctxMenu.inGroup}
      <button type="button" class="ctx-item" onclick={() => removeFromGroup(ctxMenu!.folder)}>
        ✗ Usuń z grupy
      </button>
    {/if}
    <div class="ctx-separator"></div>
    {#if !roadmapExists(ctxMenu.folder)}
      <button type="button" class="ctx-item" onclick={createRoadmap}>📋 Utwórz ROADMAP.md</button>
    {:else}
      <span class="ctx-item ctx-disabled">ROADMAP.md już istnieje</span>
    {/if}
  </div>
{/if}

<!-- ── Context menu: grupa ────────────────────────────────────────────── -->
{#if groupCtx}
  <div class="ctx-overlay" role="presentation" onclick={closeCtx} oncontextmenu={(e) => { e.preventDefault(); closeCtx(); }}></div>
  <div class="ctx-menu" style="left:{groupCtx.x}px; top:{groupCtx.y}px">
    <button type="button" class="ctx-item" onclick={() => renameGroup(groupCtx!.groupId)}>✏ Zmień nazwę</button>
    <button type="button" class="ctx-item ctx-danger" onclick={() => deleteGroup(groupCtx!.groupId)}>🗑 Usuń grupę</button>
  </div>
{/if}

<style>
  .folder-panel {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border);
    flex: 3;
    min-height: 100px;
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 6px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
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
  .error {
    padding: 5px 12px;
    font-size: 11px;
    color: #c0392b;
    background: #fdf0ef;
    border-bottom: 1px solid #f5c6c2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  /* empty */
  .empty {
    padding: 16px 12px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
  }
  .empty p { margin: 0 0 8px; }
  .add-first {
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .add-first:hover { filter: brightness(1.1); }

  /* ── Folder row ─────────────────────────────────────────────────────────── */
  .row {
    display: flex;
    align-items: center;
    transition: background 0.1s;
    min-height: 30px;
  }
  .row.indented { padding-left: 12px; }
  .row:hover { background: var(--hover); }
  .row.selected { background: var(--accent); }
  .row.selected .item { color: var(--accent-fg); }
  .row.selected .foldername { opacity: 0.65; }
  .row.selected .btn-alias,
  .row.selected .remove {
    color: rgba(255,255,255,0.6);
    opacity: 1;
  }
  .row.selected .btn-alias:hover,
  .row.selected .remove:hover {
    background: rgba(255,255,255,0.15);
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
  .names {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
  }
  .alias {
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .foldername {
    font-size: 10px;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .btn-alias {
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 12px;
    line-height: 1;
    padding: 4px 5px;
    cursor: pointer;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.1s;
  }
  .row:hover .btn-alias { opacity: 1; }
  .btn-alias:hover { background: var(--hover); color: var(--fg); }
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
  .row:hover .remove { opacity: 1; }
  .remove:hover { background: var(--hover); color: var(--fg); }

  /* alias edit row */
  .alias-edit {
    display: flex;
    align-items: center;
    flex: 1;
    gap: 4px;
    padding: 4px 8px;
  }
  .alias-input {
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
  .edit-confirm, .edit-cancel {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 13px;
    padding: 2px 5px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .edit-confirm:hover { color: #27ae60; }
  .edit-cancel:hover { color: #e74c3c; }

  /* ── Grupy ──────────────────────────────────────────────────────────────── */
  .group-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px 4px;
    border-top: 1px solid var(--border);
    margin-top: 2px;
    cursor: default;
    user-select: none;
  }
  .group-header:first-child { border-top: none; margin-top: 0; }
  .group-toggle {
    background: transparent;
    border: none;
    font-size: 9px;
    color: var(--muted);
    cursor: pointer;
    padding: 2px 3px;
    line-height: 1;
    flex-shrink: 0;
  }
  .group-toggle:hover { color: var(--fg); }
  .group-name {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .group-count {
    font-size: 10px;
    color: var(--muted);
    background: var(--hover);
    padding: 1px 5px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  /* ── Context menus ──────────────────────────────────────────────────────── */
  .ctx-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
  }
  .ctx-menu {
    position: fixed;
    z-index: 1000;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    min-width: 190px;
    padding: 4px 0;
  }
  .ctx-item {
    display: block;
    width: 100%;
    padding: 7px 14px;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--fg);
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    white-space: nowrap;
  }
  .ctx-item:hover:not(:disabled) { background: var(--hover); }
  .ctx-item:disabled { color: var(--muted); cursor: default; opacity: 0.5; }
  .ctx-sub { padding-left: 22px; font-size: 12px; }
  .ctx-disabled {
    display: block;
    padding: 7px 14px;
    color: var(--muted);
    font-size: 12px;
    font-style: italic;
  }
  .ctx-danger { color: #c0392b; }
  .ctx-danger:hover { background: #fdf0ef !important; }
  .ctx-separator {
    height: 1px;
    background: var(--border);
    margin: 3px 0;
  }
</style>
