"""face_auth/encoder.py — Face encoding extraction."""

import cv2
import numpy as np
import face_recognition


def extract_encoding(image_bytes):
    """
    Extract 128-d face encoding from image bytes.

    Args:
        image_bytes: raw JPEG/PNG bytes

    Returns:
        (encoding, None) on success — encoding is numpy array of 128 floats
        (None, error_message) on failure
    """
    if not image_bytes:
        return None, "Empty image"

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return None, "Invalid image format"

    # Convert BGR → RGB (face_recognition expects RGB)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Detect faces + compute encodings
    encodings = face_recognition.face_encodings(rgb)

    if len(encodings) == 0:
        return None, "No face detected — please try again"
    if len(encodings) > 1:
        return None, "Multiple faces detected — only one person allowed"

    return encodings[0], None


def extract_all_encodings(image_bytes):
    """Return all face encodings in image (for multi-face detection)."""
    if not image_bytes:
        return []

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return []

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return face_recognition.face_encodings(rgb)