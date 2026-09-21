"""controllers/admin_controller.py — Admin dashboard API with login images."""

from flask import Blueprint, jsonify, session, render_template, redirect, url_for
from database.db import get_connection
from face_auth.register import list_students

bp = Blueprint("admin", __name__)


def _is_admin():
    return session.get("role") == "admin"


@bp.route("/admin/dashboard")
def dashboard():
    """Admin dashboard HTML page."""
    if not _is_admin():
        return redirect(url_for("pages.login"))
    return render_template("admin_dashboard.html")


@bp.route("/api/violations")
def api_violations():
    """Get recent violations."""
    if not _is_admin():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, student_id, violation_type, confidence, timestamp "
            "FROM violations ORDER BY timestamp DESC LIMIT 100"
        ).fetchall()
        return jsonify({
            "success": True,
            "violations": [dict(r) for r in rows]
        })
    finally:
        conn.close()


@bp.route("/api/students")
def api_students():
    """Get all registered students."""
    if not _is_admin():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    return jsonify({"success": True, "students": list_students()})


@bp.route("/api/stats")
def api_stats():
    """Dashboard summary stats."""
    if not _is_admin():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    conn = get_connection()
    try:
        total_students = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        total_logins = conn.execute("SELECT COUNT(*) FROM login_logs WHERE success = 1").fetchone()[0]
        total_violations = conn.execute("SELECT COUNT(*) FROM violations").fetchone()[0]

        # Violations in last 24h
        violations_24h = conn.execute(
            "SELECT COUNT(*) FROM violations WHERE timestamp >= datetime('now', '-1 day')"
        ).fetchone()[0]

        return jsonify({
            "success": True,
            "stats": {
                "total_students": total_students,
                "total_logins": total_logins,
                "total_violations": total_violations,
                "violations_24h": violations_24h,
            }
        })
    finally:
        conn.close()


@bp.route("/api/login_logs")
def api_login_logs():
    """Recent login attempts with image path."""
    if not _is_admin():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, student_id, success, timestamp, ip_address, details, image_path "
            "FROM login_logs ORDER BY timestamp DESC LIMIT 50"
        ).fetchall()
        return jsonify({
            "success": True,
            "logs": [dict(r) for r in rows]
        })
    finally:
        conn.close()