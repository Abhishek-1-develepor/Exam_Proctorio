"""config.py — ProctorVision central configuration."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Config:
    # ---------- Security ----------
    SECRET_KEY = os.environ.get("SECRET_KEY", "proctorvision-secret-2026")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "pv-admin-2026")

    # ---------- Database ----------
    DB_PATH = str(BASE_DIR / "database" / "proctorvision.db")

    # ---------- Models ----------
    MODEL_ONNX_PATH = str(BASE_DIR / "models" / "best.onnx")
    MODEL_PT_PATH   = str(BASE_DIR / "models" / "best.pt")

    # ---------- Detection ----------
    CLASS_NAMES = ["book", "cell phone", "headphone", "laptop", "person", "tv"]
    CONF_THRESHOLD = 0.4
    IOU_THRESHOLD = 0.45
    VIOLATION_CLASSES = ["cell phone", "book", "laptop"]

    # ---------- Face ----------
    # Cosine similarity threshold for MediaPipe face matching
# Range: 0.85 (strict) — 0.95 (lenient)
# 0.90 is a good starting point
    FACE_MATCH_TOLERANCE = 0.90

    # ---------- Uploads ----------
    UPLOAD_DIR = str(BASE_DIR / "uploads" / "snapshots")
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024   # 8 MB

    # ---------- Logs ----------
    LOG_FILE = str(BASE_DIR / "logs" / "proctorvision.log")
    VIOLATION_LOG = str(BASE_DIR / "logs" / "violations.log")