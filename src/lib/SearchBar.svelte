<script lang="ts">
  import { ui, notes, dates } from "./stores.svelte";
  import { api, toLocalTime, toLocalDay } from "./ipc";
  import type { SearchHit } from "./ipc";

  let query = $state("");
  let hits = $state<SearchHit[]>([]);
  let throttleTimer: number | null = null;
  let inputEl: HTMLInputElement | undefined = $state();
  let selectedIdx = $state(0);

  function schedule() {
    if (throttleTimer !== null) clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(run, 150);
  }

  async function run() {
    if (!query.trim()) {
      hits = [];
      return;
    }
    hits = await api.searchNotes(query, 30);
    selectedIdx = 0;
  }

  async function pick(hit: SearchHit) {
    const day = toLocalDay(hit.created_at);
    dates.selectedDay = day;
    dates.calendarDate = new Date(day);
    await notes.refreshMonth(dates.year, dates.month);
    await notes.refreshDay(day);
    await notes.load(hit.id);
    close();
  }

  function close() {
    ui.searchOpen = false;
    query = "";
    hits = [];
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, hits.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[selectedIdx]) pick(hits[selectedIdx]);
    }
  }

  $effect(() => {
    if (ui.searchOpen) {
      // focus po otwarciu
      requestAnimationFrame(() => inputEl?.focus());
    }
  });
</script>

{#if ui.searchOpen}
  <div
    class="backdrop"
    role="button"
    tabindex="-1"
    aria-label="Zamknij wyszukiwanie"
    onclick={close}
    onkeydown={(e) => e.key === "Escape" && close()}
  ></div>
  <div class="panel" role="dialog" aria-label="Wyszukiwanie notatek">
    <input
      bind:this={inputEl}
      bind:value={query}
      oninput={schedule}
      onkeydown={onKey}
      placeholder="Szukaj w notatkach… (Esc zamyka)"
    />
    {#if hits.length > 0}
      <ul>
        {#each hits as h, i (h.id)}
          {@const day = toLocalDay(h.created_at)}
          {@const time = toLocalTime(h.created_at)}
          <li>
            <button
              type="button"
              class="hit"
              class:selected={i === selectedIdx}
              onclick={() => pick(h)}
              onmouseenter={() => (selectedIdx = i)}
            >
              <span class="meta">{day} · {time}</span>
              <!-- snippet_html zawiera <mark> z FTS5 -->
              {@html h.snippet_html}
            </button>
          </li>
        {/each}
      </ul>
    {:else if query.trim()}
      <p class="empty">Brak wyników.</p>
    {/if}
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 100;
  }
  .panel {
    position: fixed;
    top: 8vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(640px, 90vw);
    max-height: 70vh;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    z-index: 101;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }
  input {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    padding: 14px 16px;
    font-size: 15px;
    color: var(--fg);
    outline: none;
  }
  ul {
    list-style: none;
    padding: 6px;
    margin: 0;
    overflow-y: auto;
  }
  .hit {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    color: var(--fg);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hit.selected {
    background: var(--hover);
    border-color: var(--accent);
  }
  .meta {
    color: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .hit :global(mark) {
    background: var(--accent);
    color: var(--accent-fg);
    padding: 0 2px;
    border-radius: 2px;
  }
  .empty {
    color: var(--muted);
    padding: 16px;
    margin: 0;
    font-size: 13px;
  }
</style>
