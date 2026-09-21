"""controllers/page_controller.py — HTML page routes."""

from flask import Blueprint, render_template, session, redirect, url_for

bp = Blueprint("pages", __name__)


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