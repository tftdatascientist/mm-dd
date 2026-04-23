# MM.DD — Notatnik Markdown / Przeglądarka plików

Lekki notatnik Windows zbudowany na Tauri 2 + SvelteKit + SQLite.

## Architektura

```
mm-dd/
├── src/                        # Frontend SvelteKit (SPA)
│   ├── routes/+page.svelte     # Główny layout (sidebar + editor)
│   └── lib/
│       ├── FolderPanel.svelte  # Lista folderów z lokalnego dysku
│       ├── FileList.svelte     # Pliki .md w zaznaczonym folderze
│       ├── Editor.svelte       # CodeMirror 6 — tryb plikowy i notatkowy
│       ├── StatusBar.svelte    # Stopka: auto-zapis, zapis, tryb ciemny
│       ├── SearchBar.svelte    # Modal FTS5 (Ctrl+F)
│       ├── stores.svelte.ts    # Stan globalny (Svelte 5 runes)
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

- **Auto-zapis**: toggle w stopce; gdy ON — debounce 500ms po każdej zmianie
- **Ręczny zapis**: przycisk "Zapisz" w stopce (aktywny gdy są zmiany) lub `Ctrl+S`
- **Sortowanie plików**: `CLAUDE.md` → `PLAN.md` → `ARCHITECTURE.md` → `CONVENTIONS.md` → `README.md` → reszta alfabetycznie
- **Kolor priorytetowy**: bursztynowy (`#7a5500` jasny / `#c9a84c` ciemny)

### Tryb notatkowy (fallback)
Gdy żaden plik nie jest wybrany, edytor pracuje ze starymi notatkami SQLite (widoczne tylko przez `Ctrl+F`).

## Persystencja

SQLite `%APPDATA%\com.mmdd.app\notes.db`, tabela `meta` (klucz → wartość):

| klucz | wartość | opis |
|---|---|---|
| `folders` | JSON `["C:/path", ...]` | lista folderów |
| `folder_autosave` | `"0"` / `"1"` | stan auto-zapisu |
| `priority_files` | JSON array nazw | kolejność priorytetowa (opcjonalne nadpisanie) |
| `dark_mode` | `null`/`"0"`/`"1"` | motyw |
| `show_timestamps` | `"0"`/`"1"` | godziny w stopce |

## Komendy IPC (Rust ↔ Frontend)

| komenda | opis |
|---|---|
| `list_folders` | pobierz listę folderów z meta |
| `add_folder(path)` | dodaj folder do meta |
| `remove_folder(path)` | usuń folder z meta |
| `list_md_files(folder)` | pliki .md posortowane wg priorytetu |
| `read_file(path)` | odczytaj zawartość pliku |
| `write_file(path, content)` | zapisz plik na dysk |
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
npm run dev          # Vite dev server (port 1420)
cargo tauri dev      # Tauri dev window
npm run check        # svelte-check + TypeScript
cargo check -j 1     # Rust (dodaj RUST_MIN_STACK=67108864 jeśli stack overflow)
```

## Build (instalator Windows)

```bash
cargo tauri build
# Wynik: src-tauri/target/release/bundle/
#   msi/   → MM.DD_x.x.x_x64_en-US.msi
#   nsis/  → MM.DD_x.x.x_x64-setup.exe
```

Instalacja nowszej wersji na istniejącą działa bez odinstalowywania — dane (SQLite) są zachowane.
