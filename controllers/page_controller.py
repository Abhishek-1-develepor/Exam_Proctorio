"""controllers/page_controller.py — HTML page routes + exam submission."""

from datetime import datetime
from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request

bp = Blueprint("pages", __name__)

# ═══════════════════════════════════════════════════════════════
# EXAM SUBMISSIONS STORE
# ═══════════════════════════════════════════════════════════════
exam_submissions = {}


@bp.route("/")
def index():
    """Redirect root to login."""
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return redirect(url_for("pages.login"))


@bp.route("/login")
def login():
    """Face login page."""
    if session.get("role") == "admin":
        return redirect(url_for("admin.dashboard"))
    if session.get("student_id"):
        return redirect(url_for("pages.student_session"))
    return render_template("login.html")


@bp.route("/register")
def register():
    """Face registration page."""
    return render_template("register.html")


@bp.route("/session")
def student_session():
    """Live exam monitoring session."""
    if not session.get("student_id"):
        return redirect(url_for("pages.login"))
    return render_template("student_session.html")


# ═══════════════════════════════════════════════════════════════
# EXAM SUBMIT ENDPOINT
# ═══════════════════════════════════════════════════════════════
@bp.route("/api/exam/submit", methods=["POST"])
def submit_exam():
    """Submit exam — with duplicate protection."""
    try:
        data = request.get_json()
        
        # Get student ID from session
        student_id = session.get("student_id") or request.remote_addr
        
        # Check if already submitted
        if student_id in exam_submissions:
            return jsonify({
                "error": "Exam already submitted",
                "submitted_at": exam_submissions[student_id]["submitted_at"]
            }), 409
        
        # Save submission
        submission = {
            "student_id": student_id,
            "score": data.get("score", 0),
            "total": data.get("total", 0),
            "answers": data.get("answers", {}),
            "submitted_at": datetime.utcnow().isoformat()
        }
        exam_submissions[student_id] = submission
        
        print(f"[EXAM] Submitted by {student_id}: {submission['score']}/{submission['total']}")
        
        return jsonify({
            "status": "submitted",
            "submission": submission
        }), 200
        
    except Exception as e:
        print(f"[EXAM] Submit error: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════
# EXAM STATUS ENDPOINT
# ═══════════════════════════════════════════════════════════════
@bp.route("/api/exam/status", methods=["GET"])
def exam_status():
    """Check if student already submitted."""
    student_id = session.get("student_id") or request.remote_addr
    
    if student_id in exam_submissions:
        return jsonify({
            "submitted": True,
            "submitted_at": exam_submissions[student_id]["submitted_at"]
        })
    
    return jsonify({"submitted": False})