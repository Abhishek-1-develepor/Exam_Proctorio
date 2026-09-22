"""face_auth/encoder.py — MediaPipe-based face encoding."""

import cv2
import numpy as np
import mediapipe as mp

# MediaPipe FaceMesh — 468 landmarks
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=2,
    refine_landmarks=True,
    min_detection_confidence=0.5,
)


def extract_encoding(image_bytes):
    """
    Extract a face descriptor from an image using MediaPipe FaceMesh.

    Returns a normalized 478×3 landmark vector (1434 features).

    Args:
        image_bytes: raw JPEG/PNG bytes

    Returns:
        (encoding, None) on success — numpy array
        (None, error_message) on failure
    """
    if not image_bytes:
        return None, "Empty image"

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return None, "Invalid image format"

    # Resize for speed (max 640px)
    h, w = img.shape[:2]
    if max(h, w) > 640:
        scale = 640 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return None, "No face detected — please try again"

    if len(results.multi_face_landmarks) > 1:
        return None, "Multiple faces detected — only one person allowed"

    # Extract 468+ landmarks (478 with iris)
    landmarks = results.multi_face_landmarks[0].landmark
    features = []
    for lm in landmarks:
        features.extend([lm.x, lm.y, lm.z])

    encoding = np.array(features, dtype=np.float32)

    # Normalize (subtract mean, divide by std)
    encoding = (encoding - encoding.mean()) / (encoding.std() + 1e-6)

    return encoding, None


def extract_all_encodings(image_bytes):
    """Return all face encodings in an image (for multi-face detection)."""
    if not image_bytes:
        return []

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return []

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return []

    encodings = []
    for face in results.multi_face_landmarks:
        features = []
        for lm in face.landmark:
            features.extend([lm.x, lm.y, lm.z])
        enc = np.array(features, dtype=np.float32)
        enc = (enc - enc.mean()) / (enc.std() + 1e-6)
        encodings.append(enc)

    return encodings