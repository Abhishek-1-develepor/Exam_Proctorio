"""controllers/page_controller.py — HTML page routes + exam submission."""

from datetime import datetime
from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request

bp = Blueprint("pages", __name__)


@bp.route("/")
def index():
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return redirect(url_for("pages.login"))


@bp.route("/login")
def login():
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return render_template("login.html")


@bp.route("/register")
def register():
    return render_template("register.html")


@bp.route("/session")
def student_session():
    if not session.get("student_id"):
        return redirect(url_for("pages.login"))
    return render_template("student_session.html")


# ═══════════════════════════════════════════════════════════════
# EXAM SUBMIT — NO RESTRICTIONS (allow retake)
# ═══════════════════════════════════════════════════════════════
@bp.route("/api/exam/submit", methods=["POST"])
def submit_exam():
    try:
        data = request.get_json()
        
        # ⚠️ Log submission but don't block
        student_id = session.get("student_id") or "anonymous"
        print(f"[EXAM] Submitted by {student_id}")
        
        # Just acknowledge — no blocking, no storage
        return jsonify({"status": "submitted"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/api/exam/status", methods=["GET"])
def exam_status():
    # ⚠️ Always return false — allow retake
    return jsonify({"submitted": False})

from datetime import datetime
from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request

bp = Blueprint("pages", __name__)


@bp.route("/")
def index():
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return redirect(url_for("pages.login"))


@bp.route("/login")
def login():
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return render_template("login.html")


@bp.route("/register")
def register():
    return render_template("register.html")


@bp.route("/session")
def student_session():
    if not session.get("student_id"):
        return redirect(url_for("pages.login"))
    return render_template("student_session.html")


# ═══════════════════════════════════════════════════════════════
# EXAM SUBMIT — NO RESTRICTIONS (allow retake)
# ═══════════════════════════════════════════════════════════════
@bp.route("/api/exam/submit", methods=["POST"])
def submit_exam():
    try:
        data = request.get_json()
        
        # ⚠️ Log submission but don't block
        student_id = session.get("student_id") or "anonymous"
        print(f"[EXAM] Submitted by {student_id}")
        
        # Just acknowledge — no blocking, no storage
        return jsonify({"status": "submitted"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/api/exam/status", methods=["GET"])
def exam_status():
    # ⚠️ Always return false — allow retake
    return jsonify({"submitted": False})

from datetime import datetime
from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request

bp = Blueprint("pages", __name__)


@bp.route("/")
def index():
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return redirect(url_for("pages.login"))


@bp.route("/login")
def login():
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return render_template("login.html")


@bp.route("/register")
def register():
    return render_template("register.html")


@bp.route("/session")
def student_session():
    if not session.get("student_id"):
        return redirect(url_for("pages.login"))
    return render_template("student_session.html")


# ═══════════════════════════════════════════════════════════════
# EXAM SUBMIT — NO RESTRICTIONS (allow retake)
# ═══════════════════════════════════════════════════════════════
@bp.route("/api/exam/submit", methods=["POST"])
def submit_exam():
    try:
        data = request.get_json()
        
        # ⚠️ Log submission but don't block
        student_id = session.get("student_id") or "anonymous"
        print(f"[EXAM] Submitted by {student_id}")
        
        # Just acknowledge — no blocking, no storage
        return jsonify({"status": "submitted"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/api/exam/status", methods=["GET"])
def exam_status():
    # ⚠️ Always return false — allow retake
    return jsonify({"submitted": False})