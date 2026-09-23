/**
 * face_landmark.js — Browser-side face encoding using MediaPipe JS.
 *
 * Extracts 478 landmarks × 3 coords = 1434-dim normalized vector.
 * Exposes: window.pvFace.extractEncoding(videoElement)
 */

import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

(function () {
    let landmarker = null;

    async function init() {
        if (landmarker) return;

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU",
            },
            runningMode: "IMAGE",
            numFaces: 3,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
        });

        console.log("[Face] Landmarker ready");
    }

    function normalize(landmarks) {
        // Flatten: [{x,y,z}, ...] → [x1,y1,z1,x2,y2,z2, ...]
        const flat = [];
        for (const lm of landmarks) {
            flat.push(lm.x, lm.y, lm.z);
        }

        // Mean-center
        const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
        const centered = flat.map((v) => v - mean);

        // Unit-scale
        let maxAbs = 0;
        for (const v of centered) {
            const a = Math.abs(v);
            if (a > maxAbs) maxAbs = a;
        }

        const normalized = maxAbs > 0
            ? centered.map((v) => v / maxAbs)
            : centered;

        return normalized;
    }

    window.pvFace = {
        async extractEncoding(videoElement) {
            if (!landmarker) await init();

            if (!videoElement || videoElement.readyState < 2) {
                return { success: false, error: "Video not ready" };
            }

            const result = landmarker.detect(videoElement);
            const faces = result.faceLandmarks || [];

            if (faces.length === 0) {
                return { success: false, error: "No face detected" };
            }
            if (faces.length > 1) {
                return { success: false, error: "Multiple faces detected" };
            }

            const vector = normalize(faces[0]);
            return { success: true,  encoding: Array.from(vector) };
        },

        isReady() {
            return landmarker !== null;
        },
    };

    console.log("[Face] Module loaded");
})();