use crate::db::Db;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: i64,
    pub created_at: String,
    pub updated_at: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteSummary {
    pub id: i64,
    pub created_at: String,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit {
    pub id: i64,
    pub created_at: String,
    pub snippet_html: String,
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

fn make_snippet(content: &str, max_chars: usize) -> String {
    let trimmed = content.trim_start();
    let first_line = trimmed.lines().find(|l| !l.trim().is_empty()).unwrap_or("");
    let mut out: String = first_line.chars().take(max_chars).collect();
    if first_line.chars().count() > max_chars {
        out.push('…');
    }
    if out.is_empty() {
        "(pusta notatka)".to_string()
    } else {
        out
    }
}

#[tauri::command]
pub fn create_note(db: State<'_, Db>) -> Result<i64, String> {
    let now = now_iso();
    db.with_conn(|c| {
        c.execute(
            "INSERT INTO notes(created_at, updated_at, content) VALUES (?1, ?2, '')",
            [&now, &now],
        )?;
        Ok(c.last_insert_rowid())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note(db: State<'_, Db>, id: i64, content: String) -> Result<(), String> {
    let now = now_iso();
    db.with_conn(|c| {
        c.execute(
            "UPDATE notes SET content = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![content, now, id],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(db: State<'_, Db>, id: i64) -> Result<(), String> {
    db.with_conn(|c| {
        c.execute("DELETE FROM notes WHERE id = ?1", [id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_note(db: State<'_, Db>, id: i64) -> Result<Note, String> {
    db.with_conn(|c| {
        let note = c.query_row(
            "SELECT id, created_at, updated_at, content FROM notes WHERE id = ?1",
            [id],
            |r| {
                Ok(Note {
                    id: r.get(0)?,
                    created_at: r.get(1)?,
                    updated_at: r.get(2)?,
                    content: r.get(3)?,
                })
            },
        )?;
        Ok(note)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_notes_for_day(db: State<'_, Db>, day: String) -> Result<Vec<NoteSummary>, String> {
    db.with_conn(|c| {
        let mut stmt = c.prepare(
            "SELECT id, created_at, content FROM notes WHERE day = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt
            .query_map([&day], |r| {
                let content: String = r.get(2)?;
                Ok(NoteSummary {
                    id: r.get(0)?,
                    created_at: r.get(1)?,
                    snippet: make_snippet(&content, 60),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_days_with_notes(
    db: State<'_, Db>,
    year: i32,
    month: u32,
) -> Result<Vec<String>, String> {
    let month_prefix = format!("{:04}-{:02}", year, month);
    db.with_conn(|c| {
        let mut stmt =
            c.prepare("SELECT DISTINCT day FROM notes WHERE day LIKE ?1 || '%' ORDER BY day")?;
        let days = stmt
            .query_map([&month_prefix], |r| r.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(days)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_notes(
    db: State<'_, Db>,
    query: String,
    limit: u32,
) -> Result<Vec<SearchHit>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }
    // FTS5 MATCH: opakuj każdy token w cudzysłowy + prefix *, żeby uniknąć parse errorów
    // (np. gdy user wpisze słowo z apostrofem albo syntaxem FTS)
    let tokens: Vec<String> = q
        .split_whitespace()
        .filter(|t| !t.is_empty())
        .map(|t| format!("\"{}\"*", t.replace('"', "")))
        .collect();
    if tokens.is_empty() {
        return Ok(vec![]);
    }
    let match_expr = tokens.join(" ");

    let result = db.with_conn(|c| {
        let mut stmt = c.prepare(
            "SELECT n.id, n.created_at, snippet(notes_fts, 0, '<mark>', '</mark>', '…', 12)
             FROM notes_fts
             JOIN notes n ON n.id = notes_fts.rowid
             WHERE notes_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2",
        )?;
        let hits = stmt
            .query_map(rusqlite::params![match_expr, limit as i64], |r| {
                Ok(SearchHit {
                    id: r.get(0)?,
                    created_at: r.get(1)?,
                    snippet_html: r.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(hits)
    });

    // Typowe błędy FTS (niekompletny token, syntax) = pusty wynik zamiast twardego erroru
    match result {
        Ok(hits) => Ok(hits),
        Err(e) => {
            eprintln!("search error: {}", e);
            Ok(vec![])
        }
    }
}

#[tauri::command]
pub fn export_note_to_md(
    db: State<'_, Db>,
    id: i64,
    path: String,
) -> Result<(), String> {
    let note = get_note(db, id)?;
    let frontmatter = format!(
        "---\ncreated_at: {}\nupdated_at: {}\nid: {}\n---\n\n",
        note.created_at, note.updated_at, note.id
    );
    let body = format!("{}{}", frontmatter, note.content);
    std::fs::write(&path, body).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_meta(db: State<'_, Db>, key: String) -> Result<Option<String>, String> {
    db.with_conn(|c| {
        let v: Option<String> = c
            .query_row("SELECT value FROM meta WHERE key = ?1", [&key], |r| r.get(0))
            .ok();
        Ok(v)
    })
    .map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub fn set_meta(db: State<'_, Db>, key: String, value: String) -> Result<(), String> {
    db.with_conn(|c| {
        c.execute(
            "INSERT INTO meta(key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![key, value],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn count_words(content: String) -> u32 {
    content.split_whitespace().count() as u32
}
