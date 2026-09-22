"""face_auth/verifier.py — MediaPipe-based face verification."""

import pickle
import numpy as np
from database.db import get_connection
from config import Config


def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def verify_face(encoding, threshold=None):
    """
    Compare encoding against all registered students using
    cosine similarity on MediaPipe FaceMesh vectors.

    Args:
        encoding: numpy array (normalized landmark vector)
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

    best_match = None
    best_score = -1.0

    for row in rows:
        try:
            known = pickle.loads(row["face_encoding"])
            score = cosine_similarity(known, encoding)

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

    return None, f"Face not recognized (best similarity: {best_score:.3f})"