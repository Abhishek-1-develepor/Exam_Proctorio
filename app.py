"""app.py — ProctorVision Flask entry point."""

import os
from flask import Flask, jsonify, render_template

from config import Config
from database.db import init_db
from controllers import register_blueprints
from utils.logger import log


def create_app():
    """Application factory."""
    app = Flask(__name__)
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
    app.config["JSON_SORT_KEYS"] = False

    # ---------- Init database ----------
    init_db()

    # ---------- Register blueprints ----------
    register_blueprints(app)

    # ---------- Health check ----------
    @app.route("/health")
    def health():
        return jsonify({
            "status": "ok",
            "app": "ProctorVision",
            "version": "1.0.0"
        })
    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        """Serve login-time images to admin dashboard."""
        from flask import send_from_directory
        return send_from_directory(Config.UPLOAD_DIR, filename)

    # ---------- Error handlers ----------
    @app.errorhandler(404)
    def not_found(e):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        log.error(f"500 error: {e}")
        return render_template("errors/500.html"), 500

    @app.errorhandler(413)
    def payload_too_large(e):
        return jsonify({"success": False, "error": "File too large (max 8MB)"}), 413

    log.info("ProctorVision app created")
    return app


app = create_app()


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  ProctorVision — AI-Powered Exam Proctoring")
    print("=" * 60)

    print("\n[ROUTES]")
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: str(r)):
        methods = ",".join(sorted(rule.methods - {"HEAD", "OPTIONS"}))
        print(f"  {str(rule):<40} {methods}")

    print("\n[SERVER]")
    print("  http://127.0.0.1:5000")
    print("  http://localhost:5000")
    print("=" * 60 + "\n")

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)