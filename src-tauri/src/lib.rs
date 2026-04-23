mod commands;
mod db;

use db::Db;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("brak app_data_dir: {}", e))?;
            let db_path = data_dir.join("notes.db");
            let db = Db::open(db_path).map_err(|e| format!("init DB: {}", e))?;

            // Powitalna notatka przy pierwszym starcie
            let is_empty: i64 = db
                .with_conn(|c| {
                    Ok(c.query_row("SELECT COUNT(*) FROM notes", [], |r| r.get::<_, i64>(0))?)
                })
                .unwrap_or(0);
            if is_empty == 0 {
                let _ = db.with_conn(|c| {
                    let now = chrono::Utc::now()
                        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
                    c.execute(
                        "INSERT INTO notes(created_at, updated_at, content) VALUES (?1, ?2, ?3)",
                        rusqlite::params![
                            now,
                            now,
                            "# Witaj w MM.DD\n\nPisz, a my zapamiętamy — bez nazw plików, bez lokalizacji.\n\n**Skróty:**\n- `Ctrl+N` — nowa notatka\n- `Ctrl+F` — szukaj\n- `Ctrl+E` — eksport do .md\n- `Ctrl+T` — pokaż/ukryj godziny\n- `Ctrl+Del` — usuń notatkę\n\nNotatki znajdziesz po dacie (kalendarz) lub po treści (wyszukiwarka)."
                        ],
                    )?;
                    Ok(())
                });
            }

            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::get_note,
            commands::list_notes_for_day,
            commands::list_days_with_notes,
            commands::search_notes,
            commands::export_note_to_md,
            commands::get_meta,
            commands::set_meta,
            commands::count_words,
            commands::list_folders,
            commands::add_folder,
            commands::remove_folder,
            commands::list_md_files,
            commands::read_file,
            commands::write_file,
            commands::create_md_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
