"""controllers/detect_controller.py — YOLO detection API."""

from flask import Blueprint, request, jsonify, session
from ml.detector import get_detector
from ml.report import summarize_detections, get_violation_message
from utils.image_utils import base64_to_cv2
from utils.logger import log
from database.db import get_connection

bp = Blueprint("detect", __name__)


@bp.route("/api/detect", methods=["POST"])
def api_detect():
    """Run YOLO inference on a base64 frame."""
    try:
        detector = get_detector()
    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 500
    except Exception as e:
        log.error(f"Detector init failed: {e}")
        return jsonify({"success": False, "error": "Model unavailable"}), 500

    data = request.get_json(silent=True) or {}
    frame_b64 = data.get("frame", "")

    if not frame_b64:
        return jsonify({"success": False, "error": "No frame provided"}), 400

    try:
        img = base64_to_cv2(frame_b64)
        if img is None:
            return jsonify({"success": False, "error": "Invalid frame"}), 400

        detections = detector.predict(img)
        summary = summarize_detections(detections)

        return jsonify({
            "success": True,
            "detections": detections,
            "summary": summary,
        })
    except Exception as e:
        log.error(f"Detection error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/api/violation/log", methods=["POST"])
def api_log_violation():
    """Log a violation (from client-side MediaPipe head tracking etc)."""
    data = request.get_json(silent=True) or {}
    violation_type = str(data.get("type", "unknown")).strip()
    confidence = float(data.get("confidence", 0.0))
    student_id = session.get("student_id") or data.get("student_id")

    if not violation_type:
        return jsonify({"success": False, "error": "Violation type required"}), 400

    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO violations (student_id, violation_type, confidence) VALUES (?, ?, ?)",
            (student_id, violation_type, confidence)
        )
        conn.commit()

        # Log to violation file
        from config import Config
        with open(Config.VIOLATION_LOG, "a", encoding="utf-8") as f:
            from datetime import datetime
            f.write(f"[{datetime.now().isoformat()}] {student_id or 'unknown'} — {violation_type} ({confidence:.2f})\n")

        log.info(f"Violation logged: {violation_type} for {student_id or 'unknown'}")
        return jsonify({"success": True})
    except Exception as e:
        log.error(f"Violation log error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()