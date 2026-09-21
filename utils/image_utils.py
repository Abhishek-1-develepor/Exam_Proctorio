"""utils/image_utils.py — Image conversion helpers."""

import base64
import numpy as np
import cv2


def base64_to_bytes(b64_string):
    """Strip data URL prefix (data:image/jpeg;base64,...) and decode."""
    if not b64_string:
        return b""
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    return base64.b64decode(b64_string)


def bytes_to_cv2(image_bytes):
    """Convert raw bytes to OpenCV BGR image."""
    if not image_bytes:
        return None
    nparr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def base64_to_cv2(b64_string):
    """One-shot: base64 string → OpenCV BGR image."""
    return bytes_to_cv2(base64_to_bytes(b64_string))


def cv2_to_base64(img, quality=85):
    """Encode OpenCV image to base64 JPEG data URL."""
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")