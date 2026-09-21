"""controllers/auth_controller.py — Auth API routes with login image capture."""

import os
import uuid
import cv2
from datetime import datetime
from flask import Blueprint, request, jsonify, session
from face_auth.encoder import extract_encoding
from face_auth.verifier import verify_face
from face_auth.register import register_student
from database.db import get_connection
from utils.image_utils import base64_to_bytes, bytes_to_cv2
from utils.logger import log
from config import Config

bp = Blueprint("auth", __name__)


# ============================================================
# STUDENT REGISTRATION
# ============================================================
@bp.route("/api/register", methods=["POST"])
def api_register():
    """Register a new student with face encoding."""
    data = request.get_json(silent=True) or {}
    image_b64 = data.get("image", "")
    student_id = str(data.get("student_id", "")).strip()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()

    if not image_b64 or not student_id or not name:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    image_bytes = base64_to_bytes(image_b64)
    if not image_bytes:
        return jsonify({"success": False, "error": "Invalid image data"}), 400

    # Extract face encoding
    encoding, err = extract_encoding(image_bytes)
    if err:
        log.warning(f"Register failed for {student_id}: {err}")
        return jsonify({"success": False, "error": err}), 400

    # Save student
    ok, msg = register_student(student_id, name, email, encoding)
    if not ok:
        log.warning(f"Register error: {msg}")
        return jsonify({"success": False, "error": msg}), 409

    log.info(f"Student registered: {student_id} ({name})")
    return jsonify({"success": True, "message": msg})


# ============================================================
# STUDENT LOGIN (face verification + image capture)
# ============================================================
@bp.route("/api/login", methods=["POST"])
def api_login():
    """Login via face verification and save login-time image."""
    data = request.get_json(silent=True) or {}
    image_b64 = data.get("image", "")

    if not image_b64:
        return jsonify({"success": False, "error": "No image provided"}), 400

    image_bytes = base64_to_bytes(image_b64)
    if not image_bytes:
        return jsonify({"success": False, "error": "Invalid image data"}), 400

    # Extract encoding from login attempt
    encoding, err = extract_encoding(image_bytes)

    ip = request.remote_addr or "unknown"

    conn = get_connection()
    try:
        # ---- Face extraction failed ----
        if err:
            conn.execute(
                "INSERT INTO login_logs (success, ip_address, details) VALUES (0, ?, ?)",
                (ip, err)
            )
            conn.commit()
            return jsonify({"success": False, "error": err}), 400

        # ---- Verify against DB ----
        student, verr = verify_face(encoding)

        if student:
            # ---------- Save login-time image ----------
            image_path = None
            try:
                os.makedirs(Config.UPLOAD_DIR, exist_ok=True)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{student['student_id']}_{timestamp}_{uuid.uuid4().hex[:6]}.jpg"
                filepath = os.path.join(Config.UPLOAD_DIR, filename)

                img = bytes_to_cv2(image_bytes)
                if img is not None:
                    cv2.imwrite(filepath, img, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    image_path = filename
                    log.info(f"Login image saved: {filename}")
            except Exception as e:
                log.warning(f"Could not save login image: {e}")

            # Insert login log with image
            conn.execute(
                "INSERT INTO login_logs (student_id, success, ip_address, image_path) "
                "VALUES (?, 1, ?, ?)",
                (student["student_id"], ip, image_path)
            )
            conn.commit()

            # Set session
            session["student_id"] = student["student_id"]
            session["name"] = student["name"]
            session["role"] = "student"

            log.info(f"Login success: {student['student_id']} from {ip}")
            return jsonify({
                "success": True,
                "student": student,
                "image_path": image_path
            })

        else:
            # Failed verification
            conn.execute(
                "INSERT INTO login_logs (success, ip_address, details) VALUES (0, ?, ?)",
                (ip, verr)
            )
            conn.commit()

            log.warning(f"Login failed from {ip}: {verr}")
            return jsonify({"success": False, "error": verr}), 401

    finally:
        conn.close()


# ============================================================
# ADMIN LOGIN (password-based)
# ============================================================
@bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    """Simple password-based admin login."""
    data = request.get_json(silent=True) or {}
    password = str(data.get("password", ""))

    if not password:
        return jsonify({"success": False, "error": "Password required"}), 400

    if password == Config.ADMIN_PASSWORD:
        session["role"] = "admin"
        session["name"] = "Admin"
        log.info(f"Admin login from {request.remote_addr}")
        return jsonify({"success": True})

    log.warning(f"Admin login failed from {request.remote_addr}")
    return jsonify({"success": False, "error": "Invalid password"}), 401


# ============================================================
# LOGOUT
# ============================================================
@bp.route("/api/logout")
def logout():
    """Clear session and return success."""
    user = session.get("name", "unknown")
    session.clear()
    log.info(f"Logout: {user}")
    return jsonify({"success": True})