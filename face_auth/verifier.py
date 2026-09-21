"""face_auth/verifier.py — Face verification against DB."""

import pickle
import face_recognition
from database.db import get_connection
from config import Config


def verify_face(encoding, tolerance=None):
    """
    Compare an encoding against all registered students.

    Args:
        encoding: numpy array of 128 floats
        tolerance: float (default from Config.FACE_MATCH_TOLERANCE)

    Returns:
        (student_dict, None) on match
        (None, error_message) on no match
    """
    if encoding is None:
        return None, "No encoding provided"

    if tolerance is None:
        tolerance = Config.FACE_MATCH_TOLERANCE

    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT student_id, name, face_encoding FROM students"
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        return None, "No students registered yet"

    known_encodings = []
    known_students = []
    for row in rows:
        try:
            enc = pickle.loads(row["face_encoding"])
            known_encodings.append(enc)
            known_students.append({
                "student_id": row["student_id"],
                "name": row["name"],
            })
        except Exception:
            continue

    if not known_encodings:
        return None, "No valid encodings in database"

    # Compare against all
    matches = face_recognition.compare_faces(
        known_encodings, encoding, tolerance=tolerance
    )

    # Get face distance for better match selection
    distances = face_recognition.face_distance(known_encodings, encoding)

    if not any(matches):
        return None, "Face not recognized"

    # Pick best match (minimum distance)
    best_idx = int(np_argmin(distances))
    if not matches[best_idx]:
        return None, "Face not recognized"

    return {
        "student_id": known_students[best_idx]["student_id"],
        "name": known_students[best_idx]["name"],
        "distance": round(float(distances[best_idx]), 4),
    }, None


def np_argmin(arr):
    """Small helper to avoid extra numpy import at top."""
    import numpy as np
    return np.argmin(arr)