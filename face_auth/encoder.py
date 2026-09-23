"""face_auth/encoder.py — Receive face encoding from browser (no MediaPipe)."""

import json
import numpy as np


def accept_encoding(encoding_input):
    """
    Validate a face encoding received from the browser.
    Handles list, string (JSON), and dict (TypedArray) inputs.

    Args:
        encoding_input: list/string/dict of floats (1434-dim landmark vector)

    Returns:
        (encoding_np_array, None) on success
        (None, error_message) on failure
    """
    if encoding_input is None:
        return None, "Encoding missing"

    # Case 1: String → parse as JSON
    if isinstance(encoding_input, str):
        try:
            encoding_input = json.loads(encoding_input)
        except Exception:
            return None, "Could not parse encoding string"

    # Case 2: Dict → sort numeric keys, extract values
    if isinstance(encoding_input, dict):
        try:
            keys = sorted(encoding_input.keys(), key=lambda k: int(k))
            encoding_input = [encoding_input[k] for k in keys]
        except Exception:
            return None, "Could not convert encoding dict"

    # Case 3: Must be list now
    if not isinstance(encoding_input, list):
        return None, f"Encoding must be a list (got {type(encoding_input).__name__})"

    if len(encoding_input) == 0:
        return None, "Empty encoding"

    if len(encoding_input) < 100:
        return None, f"Encoding too short ({len(encoding_input)} values)"

    try:
        arr = np.array(encoding_input, dtype=np.float32)
    except Exception:
        return None, "Invalid encoding format"

    if not np.all(np.isfinite(arr)):
        return None, "Encoding contains NaN or Inf"

    return arr, None