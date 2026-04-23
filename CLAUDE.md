# MM.DD — Notatnik Markdown / Przeglądarka plików

Lekki notatnik Windows zbudowany na Tauri 2 + SvelteKit + SQLite. Aktualna wersja: **0.2.0**

## Architektura

```
mm-dd/
├── src/                        # Frontend SvelteKit (SPA)
│   ├── routes/+page.svelte     # Główny layout (sidebar + editor)
│   └── lib/
│       ├── FolderPanel.svelte  # Panel folderów: aliasy, grupy, context menu
│       ├── FileList.svelte     # Pliki .md w zaznaczonym folderze + tworzenie pliku
│       ├── Editor.svelte       # CodeMirror 6 — tryb plikowy i notatkowy
│       ├── StatusBar.svelte    # Stopka: auto-zapis, zapis, tryb ciemny
│       ├── SearchBar.svelte    # Modal FTS5 (Ctrl+F)
│       ├── stores.svelte.ts    # Stan globalny (Svelte 5 runes) + FolderGroup
│       └── ipc.ts              # Wrappery Tauri invoke + typy
├── src-tauri/src/
│   ├── commands.rs             # Wszystkie komendy IPC
│   ├── db.rs                   # Inicjalizacja SQLite + schema
│   └── lib.rs                  # Tauri builder + rejestracja komend
└── CLAUDE.md
```

## Dwa tryby pracy edytora

### Tryb plikowy (główny)
Użytkownik wskazuje lokalny folder → widzi posortowane pliki `.md` → klika plik → edytuje w CodeMirror.

- **Auto-zapis**: toggle w stopce; gdy ON — debounce 500ms po każdej zmianie; kursor NIE cofa się podczas zapisu (fix v0.2.0 — `untrack` w efekcie plikowym)
- **Ręczny zapis**: przycisk "Zapisz" w stopce lub `Ctrl+S`
- **Sortowanie plików**: `ROADMAP.md` → `CLAUDE.md` → `PLAN.md` → `ARCHITECTURE.md` → `CONVENTIONS.md` → `README.md` → reszta alfabetycznie
- **Kolory priorytetowe**: ROADMAP.md — zielony (`#1a6b3a` / `#4caf72`); pozostałe priorytetowe — bursztynowy (`#7a5500` / `#c9a84c`)
- **Tworzenie pliku**: przycisk `+ Nowy plik` w FileList tworzy pusty `.md` w aktywnym folderze
- **ROADMAP.md**: prawy klawisz na folderze → opcja „Utwórz ROADMAP.md" (jeśli nie istnieje)

### Tryb notatkowy (fallback)
Gdy żaden plik nie jest wybrany, edytor pracuje ze starymi notatkami SQLite (widoczne tylko przez `Ctrl+F`).

## FolderPanel — funkcje (v0.2.0)

### Aliasy
Każdy folder może mieć własną nazwę wyświetlaną. Kliknięcie ✎ (widoczne po najechaniu) otwiera inline input. Alias wyświetlany pogrubiony, oryginalna nazwa folderu szara poniżej.

### Grupy
Foldery można grupować w collapsible sekcje:
- **Prawy klawisz na folderze** → „Nowa grupa z tym folderem" | „→ NazwaGrupy" (przenieś) | „Usuń z grupy"
- **Prawy klawisz na nagłówku grupy** → „Zmień nazwę" | „Usuń grupę" (foldery zostają)
- Grupy zwijają się klikając ▼/▶ obok nazwy

### Układ
`FolderPanel: flex: 3`, `FileList: flex: 2` → proporcja 60%/40% dostępnej wysokości sidebara.

## Persystencja

SQLite `%APPDATA%\com.mmdd.app\notes.db`, tabela `meta` (klucz → wartość):

| klucz | wartość | opis |
|---|---|---|
| `folders` | JSON `["C:/path", ...]` | lista folderów |
| `last_folder` | ścieżka | ostatnio wybrany folder (przywracany po restarcie) |
| `folder_aliases` | JSON `{"path": "alias"}` | aliasy folderów |
| `folder_groups` | JSON `FolderGroup[]` | grupy folderów |
| `folder_autosave` | `"0"` / `"1"` | stan auto-zapisu |
| `priority_files` | JSON array nazw | kolejność priorytetowa (opcjonalne nadpisanie) |
| `dark_mode` | `null`/`"0"`/`"1"` | motyw |
| `show_timestamps` | `"0"`/`"1"` | godziny w stopce |

### Typ FolderGroup
```typescript
interface FolderGroup {
  id: string;        // "g_<timestamp>"
  name: string;
  collapsed: boolean;
  folderPaths: string[];
}
```

## Komendy IPC (Rust ↔ Frontend)

| komenda | opis |
|---|---|
| `list_folders` | pobierz listę folderów z meta |
| `add_folder(path)` | dodaj folder do meta |
| `remove_folder(path)` | usuń folder z meta |
| `list_md_files(folder)` | pliki .md posortowane wg priorytetu |
| `read_file(path)` | odczytaj zawartość pliku |
| `write_file(path, content)` | zapisz plik na dysk |
| `create_md_file(folder, name)` | utwórz pusty plik .md (sanityzacja nazwy, błąd jeśli istnieje) |
| `create_note` / `update_note` / `delete_note` | notatki SQLite |
| `search_notes(query)` | FTS5 fulltext search |
| `get_meta` / `set_meta` | ustawienia K-V |

## Skróty klawiszowe

| skrót | akcja |
|---|---|
| `Ctrl+S` | zapisz aktualny plik |
| `Ctrl+F` | wyszukiwarka FTS5 |
| `Ctrl+T` | pokaż/ukryj godziny (tryb notatkowy) |

## Development

```bash
npm run dev              # Vite dev server (port 1420)
npm run tauri -- dev     # Tauri dev window (używaj zamiast cargo tauri dev)
npm run check            # svelte-check + TypeScript
cargo check              # Rust
```

## Build (instalator Windows)

```bash
npm run tauri -- build
# Wynik: src-tauri/target/release/bundle/
#   msi/   → MM.DD_x.x.x_x64_en-US.msi
#   nsis/  → MM.DD_x.x.x_x64-setup.exe
```

Instalacja nowszej wersji na istniejącą działa bez odinstalowywania — dane (SQLite) są zachowane.

## Changelog

### v0.2.0
- Aliasy folderów (inline edit, persystencja w meta)
- Grupy folderów (collapsible, context menu, persystencja)
- ROADMAP.md: najwyższy priorytet, zielony kolor, tworzenie przez context menu
- Tworzenie pustych plików .md z poziomu FileList
- Przywracanie ostatnio wybranego folderu po restarcie (`last_folder` w meta)
- Fix: kursor nie cofa się podczas auto-zapisu (`untrack` w efekcie plikowym)
- Proporcje panelu: foldery 60% / pliki 40% wysokości sidebara

### v0.1.0
- Tryb plikowy: przeglądanie folderów lokalnych, edycja .md w CodeMirror
- Tryb notatkowy: notatki SQLite z FTS5
- Auto-zapis z debounce, ciemny motyw, `Ctrl+S` / `Ctrl+F`
