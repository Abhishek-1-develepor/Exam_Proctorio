"""ml/report.py — Detection → violation summary."""

from config import Config


def summarize_detections(detections):
    """
    Categorize YOLO detections into violations.

    Args:
        detections: list of detection dicts from YOLODetector.predict()

    Returns:
        {
            "total": int,
            "counts": {class: count},
            "violations": [detection, ...],
            "violation_count": int,
            "has_violation": bool
        }
    """
    counts = {}
    violations = []

    for det in detections:
        cls = det["class"]
        counts[cls] = counts.get(cls, 0) + 1

        if cls in Config.VIOLATION_CLASSES:
            violations.append(det)

    return {
        "total": len(detections),
        "counts": counts,
        "violations": violations,
        "violation_count": len(violations),
        "has_violation": len(violations) > 0,
    }


def get_violation_message(violation_type):
    """Human-readable message for each violation type."""
    messages = {
        "cell phone": "⚠ Mobile phone detected — put it away",
        "book": "⚠ Book/notes detected — unauthorized material",
        "laptop": "⚠ Secondary screen detected — not allowed",
        "headphone": "⚠ Headphones detected — remove them",
        "person": "⚠ Multiple persons detected",
        "tv": "⚠ TV/monitor detected — unauthorized display",
    }
    return messages.get(violation_type, f"⚠ {violation_type} detected")