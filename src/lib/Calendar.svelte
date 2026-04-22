<script lang="ts">
  import { dates, notes } from "./stores.svelte";
  import { localDay, formatMonthHeader } from "./ipc";

  const weekdays = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  // Siatka 6×7 dla wybranego miesiąca
  const grid = $derived.by(() => {
    const y = dates.calendarDate.getFullYear();
    const m = dates.calendarDate.getMonth();
    const first = new Date(y, m, 1);
    // Pon=0 ... Nd=6
    const firstWeekday = (first.getDay() + 6) % 7;
    const start = new Date(y, m, 1 - firstWeekday);
    const cells: { date: Date; day: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({
        date: d,
        day: localDay(d),
        inMonth: d.getMonth() === m,
      });
    }
    return cells;
  });

  const todayKey = $derived(localDay(new Date()));

  async function selectDay(day: string) {
    dates.selectedDay = day;
    await notes.refreshDay(day);
    if (notes.dayList.length > 0) {
      await notes.load(notes.dayList[notes.dayList.length - 1].id);
    }
  }

  async function goPrev() {
    dates.prevMonth();
    await notes.refreshMonth(dates.year, dates.month);
  }

  async function goNext() {
    dates.nextMonth();
    await notes.refreshMonth(dates.year, dates.month);
  }

  async function goToday() {
    dates.today();
    await notes.refreshMonth(dates.year, dates.month);
    await selectDay(todayKey);
  }
</script>

<div class="cal">
  <header>
    <button type="button" onclick={goPrev} aria-label="Poprzedni miesiąc">‹</button>
    <span class="month">{formatMonthHeader(dates.calendarDate)}</span>
    <button type="button" onclick={goNext} aria-label="Następny miesiąc">›</button>
  </header>

  <div class="weekdays">
    {#each weekdays as w}
      <span>{w}</span>
    {/each}
  </div>

  <div class="grid">
    {#each grid as cell}
      {@const hasNotes = notes.monthDays.has(cell.day)}
      {@const isSelected = dates.selectedDay === cell.day}
      {@const isToday = cell.day === todayKey}
      <button
        type="button"
        class="cell"
        class:out={!cell.inMonth}
        class:selected={isSelected}
        class:today={isToday}
        class:has-notes={hasNotes}
        onclick={() => selectDay(cell.day)}
        aria-label={cell.day}
      >
        <span class="num">{cell.date.getDate()}</span>
        {#if hasNotes}<span class="dot"></span>{/if}
      </button>
    {/each}
  </div>

  <button type="button" class="today-btn" onclick={goToday}>Dzisiaj</button>
</div>

<style>
  .cal {
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  header button {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg);
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    font-size: 16px;
    line-height: 1;
  }
  header button:hover {
    background: var(--hover);
  }
  .month {
    font-weight: 600;
    text-transform: capitalize;
    color: var(--fg);
  }
  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    font-size: 11px;
    color: var(--muted);
    text-align: center;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  .cell {
    position: relative;
    aspect-ratio: 1;
    background: transparent;
    border: 1px solid transparent;
    color: var(--fg);
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cell:hover {
    background: var(--hover);
  }
  .cell.out {
    color: var(--muted);
    opacity: 0.45;
  }
  .cell.today {
    border-color: var(--accent);
  }
  .cell.selected {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .dot {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
  }
  .cell.selected .dot {
    background: var(--accent-fg);
  }
  .today-btn {
    margin-top: 4px;
    background: transparent;
    color: var(--muted);
    border: 1px dashed var(--border);
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 6px;
    cursor: pointer;
  }
  .today-btn:hover {
    background: var(--hover);
    color: var(--fg);
  }
</style>
