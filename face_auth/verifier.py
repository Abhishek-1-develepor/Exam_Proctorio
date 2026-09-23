"""face_auth/verifier.py — Cosine similarity based face verification."""

import pickle
import numpy as np
from database.db import get_connection
from config import Config


def _cosine_similarity(a, b):
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def verify_face(encoding, threshold=None):
    """
    Compare encoding against all registered students using cosine similarity.

    Args:
        encoding: numpy array (normalized vector)
        threshold: similarity threshold (default from Config)

    Returns:
        (student_dict, None) on match
        (None, error_message) on no match
    """
    if encoding is None:
        return None, "No encoding provided"

    if threshold is None:
        threshold = Config.FACE_MATCH_TOLERANCE

    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT student_id, name, face_encoding FROM students"
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        return None, "No students registered yet"

    best_score = -1.0
    best_match = None

    for row in rows:
        try:
            known = pickle.loads(row["face_encoding"])
            score = _cosine_similarity(known, encoding)

            if score > best_score:
                best_score = score
                best_match = row
        except Exception:
            continue

    if best_match and best_score >= threshold:
        return {
            "student_id": best_match["student_id"],
            "name": best_match["name"],
            "similarity": round(best_score, 4),
        }, None

    return None, f"Face not recognized (score: {best_score:.3f})"