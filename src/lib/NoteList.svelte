<script lang="ts">
  import { notes, ui, dates } from "./stores.svelte";
  import { toLocalTime, formatDayHeader } from "./ipc";

  async function loadNote(id: number) {
    await notes.load(id);
  }
</script>

<div class="list">
  <h3>{formatDayHeader(dates.selectedDay)}</h3>
  {#if notes.dayList.length === 0}
    <p class="empty">Brak notatek. Naciśnij <kbd>Ctrl</kbd>+<kbd>N</kbd>, żeby dodać.</p>
  {:else}
    <ul>
      {#each notes.dayList as n (n.id)}
        {@const time = toLocalTime(n.created_at)}
        <li>
          <button
            type="button"
            class="item"
            class:active={notes.current?.id === n.id}
            onclick={() => loadNote(n.id)}
            title={time}
          >
            {#if ui.showTimestamps}
              <span class="time">{time}</span>
            {/if}
            <span class="snippet">{n.snippet}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .list {
    padding: 4px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: capitalize;
    padding: 4px 0;
    border-bottom: 1px solid var(--border);
  }
  .empty {
    color: var(--muted);
    font-size: 12px;
    padding: 8px 0;
    margin: 0;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .item {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    color: var(--fg);
    font-size: 13px;
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .item:hover {
    background: var(--hover);
  }
  .item.active {
    background: var(--hover);
    border-color: var(--accent);
  }
  .time {
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    font-size: 11px;
    flex-shrink: 0;
  }
  .snippet {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  kbd {
    background: var(--hover);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 10px;
    font-family: inherit;
  }
</style>
