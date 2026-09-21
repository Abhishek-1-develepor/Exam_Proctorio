"""database/db.py — SQLite helpers."""

import sqlite3
from pathlib import Path
from config import Config


def get_connection():
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    Path(Config.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()

    # ---------- Students ----------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT UNIQUE NOT NULL,
            name            TEXT NOT NULL,
            email           TEXT,
            face_encoding   BLOB NOT NULL,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ---------- Login logs ----------
    conn.execute("""
    CREATE TABLE IF NOT EXISTS login_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  TEXT,
        success     INTEGER,
        timestamp   TEXT DEFAULT CURRENT_TIMESTAMP,
        ip_address  TEXT,
        details     TEXT,
        image_path  TEXT
    )
""")

    # ---------- Violations ----------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      TEXT,
            violation_type  TEXT NOT NULL,
            confidence      REAL,
            timestamp       TEXT DEFAULT CURRENT_TIMESTAMP,
            image_path      TEXT
        )
    """)

    # ---------- Indexes ----------
    conn.execute("CREATE INDEX IF NOT EXISTS idx_violations_ts ON violations(timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_login_ts ON login_logs(timestamp)")

    conn.commit()
    conn.close()
    print(f"[DB] Initialized at {Config.DB_PATH}")