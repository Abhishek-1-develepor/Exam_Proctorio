/**
 * face_landmark.js — Face encoding with warmup fix.
 * Exposes: window.pvFace.extractEncoding(videoElement)
 */

import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

(function () {
    let landmarker = null;
    let landmarkerReady = false;
    let warmupCount = 0;

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

        landmarkerReady = true;
        console.log("[Face] Landmarker ready");
    }

    function normalize(landmarks) {
        const flat = [];
        for (const lm of landmarks) {
            flat.push(lm.x, lm.y, lm.z);
        }
        const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
        const centered = flat.map((v) => v - mean);
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

    async function waitForVideo(videoEl, maxWait = 3000) {
        if (videoEl.readyState >= 2 && videoEl.videoWidth && videoEl.videoHeight) {
            return true;
        }
        return new Promise((resolve) => {
            const start = Date.now();
            const check = setInterval(() => {
                if (videoEl.readyState >= 2 && videoEl.videoWidth && videoEl.videoHeight) {
                    clearInterval(check);
                    resolve(true);
                } else if (Date.now() - start > maxWait) {
                    clearInterval(check);
                    resolve(false);
                }
            }, 100);
        });
    }

    window.pvFace = {
        async extractEncoding(videoElement) {
            if (!landmarker) await init();

            if (!videoElement) {
                return { success: false, error: "No video element" };
            }

            const ready = await waitForVideo(videoElement, 3000);
            if (!ready) {
                return { success: false, error: "Video not ready" };
            }

            await new Promise(r => setTimeout(r, 300));

            // Warmup: first 3 calls may return empty
            let result;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                try {
                    result = landmarker.detect(videoElement);
                    const faces = result?.faceLandmarks || [];
                    if (faces.length > 0) break;
                } catch (e) {
                    console.warn("[Face] detect attempt", attempts, "failed:", e);
                }
                attempts++;
                await new Promise(r => setTimeout(r, 200));
            }

            if (!result) {
                return { success: false, error: "Detection failed" };
            }

            const faces = result.faceLandmarks || [];

            if (faces.length === 0) {
                return { success: false, error: "No face detected" };
            }
            if (faces.length > 1) {
                return { success: false, error: "Multiple faces detected" };
            }

            const vector = normalize(faces[0]);
            return { success: true, encoding: Array.from(vector) };
        },

        isReady() {
            return landmarkerReady;
        },
    };

    console.log("[Face] Module loaded");
})();