# MM.DD

Lekki notatnik Markdown dla Windows — zamiast nazw plików i katalogów, nawigacja po datach.

**Status:** MVP (v0.1.0) — zbudowane i działające na Windows 11. Installer MSI + NSIS setup produkowane przez `npm run tauri build`.

## Instalacja (gotowy `.msi` / `.exe`)

Po zbudowaniu (`npm run tauri build`) installer znajdziesz w:

- `src-tauri/target/release/bundle/msi/MM.DD_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/MM.DD_0.1.0_x64-setup.exe`

Uruchom dowolny z nich. Dane (`notes.db`) lądują w `%APPDATA%\com.mmdd.app\`.

## Skróty

| Skrót | Akcja |
|-------|-------|
| `Ctrl+N` | Nowa notatka |
| `Ctrl+F` | Wyszukaj (FTS5, ignoruje diakrytyki) |
| `Ctrl+E` | Eksport notatki do `.md` |
| `Ctrl+T` | Pokaż / ukryj godziny w liście |
| `Ctrl+Del` | Usuń bieżącą notatkę |

## Development

### Wymagania

- Node.js 20+, Rust (stable), Windows 10/11 z WebView2
- Na Windows: `RUST_MIN_STACK=67108864` i `CARGO_BUILD_JOBS=1` przed `cargo` / `tauri build` (stack overflow rustc przy dużym grafie Tauri generics)

### Uruchomienie

```bash
npm install
RUST_MIN_STACK=67108864 npm run tauri dev
```

### Build produkcyjny

```bash
RUST_MIN_STACK=67108864 CARGO_BUILD_JOBS=1 npm run tauri build
```

## Pomysły / Roadmap

Zakres v0.1 jest świadomie wąski (zero decyzji operacyjnych). Potencjalne rozszerzenia:

- Tagi / lekka klasyfikacja (bez hierarchii folderów)
- Live preview Markdown (split view)
- Heatmapa / kalendarz aktywności na stronie startowej
- Backup / sync (np. jedno-plikowy eksport całego `notes.db` na chmurę)
- Szybki switcher (Ctrl+P) po treści + dacie
- Motywy (dark/light toggle) + konfigurowalny font edytora
- Szyfrowanie bazy (SQLCipher) dla notatek wrażliwych
- Wersja macOS / Linux (Tauri to wspiera, tylko build pipeline)

Żadne z powyższych nie jest zaplanowane — lista to notatnik pomysłów na przyszłe iteracje.

## Stack

- **Tauri 2** (Rust) — shell + IPC commands
- **Svelte 5 + SvelteKit (adapter-static)** — UI
- **CodeMirror 6** — edytor Markdown
- **SQLite + FTS5** (via rusqlite bundled) — jedyne źródło prawdy
- **chrono** — daty UTC → lokalne w UI

## Storage

Jedna baza SQLite per użytkownik: `%APPDATA%\com.mmdd.app\notes.db` (tryb WAL, indeks FTS5 z `unicode61 remove_diacritics 2`).

Pliki `.md` tylko jako celowy eksport (Ctrl+E), nigdy jako storage domyślny.
