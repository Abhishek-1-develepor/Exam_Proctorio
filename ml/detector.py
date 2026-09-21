"""ml/detector.py — YOLO ONNX inference for ProctorVision."""

from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort

from config import Config


class YOLODetector:
    """YOLO object detection using ONNX Runtime."""

    def __init__(self):
        model_path = Path(Config.MODEL_ONNX_PATH)
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {model_path}\n"
                f"Please place best.onnx in models/ folder."
            )

        self.session = ort.InferenceSession(
            str(model_path),
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.classes = Config.CLASS_NAMES
        self.conf_threshold = Config.CONF_THRESHOLD
        self.iou_threshold = Config.IOU_THRESHOLD
        print(f"[MODEL] Loaded ONNX: {model_path}")

    def _preprocess(self, img, size=640):
        """Resize + normalize image for YOLO input."""
        h, w = img.shape[:2]
        scale = size / max(h, w)
        nh, nw = int(h * scale), int(w * scale)

        resized = cv2.resize(img, (nw, nh))
        canvas = np.full((size, size, 3), 114, dtype=np.uint8)
        canvas[:nh, :nw] = resized

        # BGR → RGB, normalize, HWC → CHW, add batch dim
        blob = canvas[:, :, ::-1].astype(np.float32) / 255.0
        blob = blob.transpose(2, 0, 1)[None]
        return blob, scale, (h, w)

    def _nms(self, boxes, scores):
        """Simple Non-Maximum Suppression."""
        idxs = np.argsort(scores)[::-1]
        keep = []
        while len(idxs) > 0:
            i = idxs[0]
            keep.append(i)
            if len(idxs) == 1:
                break

            xx1 = np.maximum(boxes[i, 0], boxes[idxs[1:], 0])
            yy1 = np.maximum(boxes[i, 1], boxes[idxs[1:], 1])
            xx2 = np.minimum(boxes[i, 2], boxes[idxs[1:], 2])
            yy2 = np.minimum(boxes[i, 3], boxes[idxs[1:], 3])
            w = np.maximum(0, xx2 - xx1)
            h = np.maximum(0, yy2 - yy1)
            inter = w * h

            area_a = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
            area_b = (boxes[idxs[1:], 2] - boxes[idxs[1:], 0]) * \
                     (boxes[idxs[1:], 3] - boxes[idxs[1:], 1])
            iou = inter / (area_a + area_b - inter + 1e-6)

            idxs = idxs[1:][iou < self.iou_threshold]
        return keep

    def predict(self, img):
        """Run YOLO inference on a BGR image."""
        if img is None:
            return []

        blob, scale, orig_shape = self._preprocess(img)
        outputs = self.session.run(None, {self.input_name: blob})[0]

        # YOLOv8/v11 output: (1, 4+nc, 8400) — transpose
        if outputs.ndim == 3:
            outputs = outputs[0]
        if outputs.shape[0] < outputs.shape[1]:
            outputs = outputs.T

        # Boxes: xywh; Scores: class probabilities
        boxes_xywh = outputs[:, :4]
        scores_all = outputs[:, 4:]

        max_scores = np.max(scores_all, axis=1)
        class_ids = np.argmax(scores_all, axis=1)

        # Filter by confidence
        keep_mask = max_scores > self.conf_threshold
        boxes_xywh = boxes_xywh[keep_mask]
        max_scores = max_scores[keep_mask]
        class_ids = class_ids[keep_mask]

        if len(boxes_xywh) == 0:
            return []

        # xywh → xyxy
        boxes_xyxy = np.zeros_like(boxes_xywh)
        boxes_xyxy[:, 0] = boxes_xywh[:, 0] - boxes_xywh[:, 2] / 2
        boxes_xyxy[:, 1] = boxes_xywh[:, 1] - boxes_xywh[:, 3] / 2
        boxes_xyxy[:, 2] = boxes_xywh[:, 0] + boxes_xywh[:, 2] / 2
        boxes_xyxy[:, 3] = boxes_xywh[:, 1] + boxes_xywh[:, 3] / 2

        # NMS
        keep = self._nms(boxes_xyxy, max_scores)
        boxes_xyxy = boxes_xyxy[keep]
        max_scores = max_scores[keep]
        class_ids = class_ids[keep]

        # Undo letterbox scaling
        h_orig, w_orig = orig_shape
        results = []
        for box, conf, cid in zip(boxes_xyxy, max_scores, class_ids):
            x1, y1, x2, y2 = box
            # Clip to image bounds
            x1 = max(0, min(x1, w_orig))
            y1 = max(0, min(y1, h_orig))
            x2 = max(0, min(x2, w_orig))
            y2 = max(0, min(y2, h_orig))

            cid_int = int(cid)
            results.append({
                "class": self.classes[cid_int] if cid_int < len(self.classes) else "unknown",
                "class_id": cid_int,
                "confidence": round(float(conf), 3),
                "bbox": [round(float(x1), 1), round(float(y1), 1),
                         round(float(x2), 1), round(float(y2), 1)],
            })

        return results


# ============================================================
# Singleton — model loads once
# ============================================================
_detector = None


def get_detector():
    """Get or create the singleton detector."""
    global _detector
    if _detector is None:
        _detector = YOLODetector()
    return _detector