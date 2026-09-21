"""face_auth/register.py — Register new student."""

import pickle
import sqlite3
from database.db import get_connection


def register_student(student_id, name, email, encoding):
    """
    Save a new student with face encoding.

    Args:
        student_id: unique ID (e.g. "STU001")
        name: full name
        email: optional email
        encoding: numpy array of 128 floats

    Returns:
        (True, "message") on success
        (False, "error") on failure
    """
    if not student_id or not name:
        return False, "Student ID and name are required"

    if encoding is None:
        return False, "Face encoding is required"

    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO students (student_id, name, email, face_encoding) "
            "VALUES (?, ?, ?, ?)",
            (student_id.strip(), name.strip(), email.strip() if email else None,
             pickle.dumps(encoding))
        )
        conn.commit()
        return True, f"Student {name} registered successfully"
    except sqlite3.IntegrityError:
        return False, f"Student ID '{student_id}' already exists"
    except Exception as e:
        return False, f"Registration failed: {e}"
    finally:
        conn.close()


def delete_student(student_id):
    """Delete a student (admin only)."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
        conn.commit()
        return True, "Student deleted"
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()


def list_students():
    """Return all registered students."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, student_id, name, email, created_at FROM students ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()