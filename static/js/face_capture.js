/**
 * face_capture.js — Camera + MediaPipe FaceDetector with warmup fix.
 * Exposes: window.pvCamera
 */

import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

(function () {
    let faceDetector = null;
    let videoEl = null;
    let stream = null;
    let loopId = null;
    let lastVideoTime = -1;
    let facePresent = false;
    let faceCount = 0;
    let detectorReady = false;
    let warmupFrames = 0;
    const WARMUP_COUNT = 20;
    const FRAME_SKIP = 2;
    let skipCounter = 0;

    const callbacks = {
        faceDetected: [],
        faceLost: [],
        multipleFaces: [],
        frameTick: [],
    };

    async function initDetector() {
        if (faceDetector) return;
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        faceDetector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.3,
        });
        detectorReady = true;
        console.log("[Camera] FaceDetector ready");
    }

    function emit(event, payload) {
        callbacks[event]?.forEach((cb) => {
            try { cb(payload); } catch (e) { console.warn(e); }
        });
    }

    function loop() {
        if (!videoEl ||
            videoEl.readyState < 4 ||
            !videoEl.videoWidth ||
            !videoEl.videoHeight ||
            !detectorReady) {
            loopId = requestAnimationFrame(loop);
            return;
        }

        if (videoEl.currentTime === lastVideoTime) {
            loopId = requestAnimationFrame(loop);
            return;
        }

        lastVideoTime = videoEl.currentTime;

        if (warmupFrames < WARMUP_COUNT) {
            warmupFrames++;
            loopId = requestAnimationFrame(loop);
            return;
        }

        skipCounter++;
        if (skipCounter < FRAME_SKIP) {
            loopId = requestAnimationFrame(loop);
            return;
        }
        skipCounter = 0;

        let result;
        try {
            result = faceDetector.detectForVideo(videoEl, performance.now());
        } catch (e) {
            console.warn("[Camera] detect error:", e);
            loopId = requestAnimationFrame(loop);
            return;
        }

        if (!result) {
            loopId = requestAnimationFrame(loop);
            return;
        }

        const count = result.detections?.length || 0;
        faceCount = count;

        if (count === 1 && !facePresent) {
            facePresent = true;
            emit("faceDetected", { count });
        } else if (count === 0 && facePresent) {
            facePresent = false;
            emit("faceLost", {});
        }

        if (count > 1) {
            emit("multipleFaces", { count });
        }

        emit("frameTick", { count, present: facePresent });

        loopId = requestAnimationFrame(loop);
    }

    window.pvCamera = {
        async start(videoElement) {
            videoEl = videoElement;

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API not supported");
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false,
                });
            } catch (err) {
                console.error("[Camera] getUserMedia failed:", err.name);
                let msg = "Camera error";
                switch (err.name) {
                    case "NotAllowedError": msg = "Camera permission denied"; break;
                    case "NotFoundError": msg = "No camera found"; break;
                    case "NotReadableError": msg = "Camera in use by another app"; break;
                    default: msg = `Camera error: ${err.name}`;
                }
                throw new Error(msg);
            }

            videoEl.srcObject = stream;
            videoEl.classList.add("active");
            videoEl.setAttribute("playsinline", true);
            videoEl.setAttribute("autoplay", true);
            videoEl.muted = true;

            await new Promise((resolve) => {
                if (videoEl.readyState >= 1) return resolve();
                videoEl.onloadedmetadata = () => resolve();
                setTimeout(resolve, 3000);
            });

            try { await videoEl.play(); } catch (e) { console.warn(e); }

            await new Promise((resolve) => {
                if (videoEl.readyState >= 4) return resolve();
                videoEl.oncanplaythrough = () => resolve();
                setTimeout(resolve, 2000);
            });

            await new Promise(r => setTimeout(r, 500));

            await initDetector();

            warmupFrames = 0;
            skipCounter = 0;
            lastVideoTime = -1;
            facePresent = false;

            if (loopId) cancelAnimationFrame(loopId);
            loop();

            console.log("[Camera] Started:", videoEl.videoWidth, "x", videoEl.videoHeight);
        },

        stop() {
            if (loopId) { cancelAnimationFrame(loopId); loopId = null; }
            if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
            if (videoEl) { videoEl.srcObject = null; videoEl.classList.remove("active"); }
            facePresent = false;
            faceCount = 0;
            warmupFrames = 0;
            skipCounter = 0;
        },

        capture() {
            if (!videoEl || !videoEl.videoWidth) return null;
            const canvas = document.getElementById("canvas");
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            canvas.getContext("2d").drawImage(videoEl, 0, 0);
            return canvas.toDataURL("image/jpeg", 0.85);
        },

        isReady() { return stream !== null && videoEl !== null; },
        getFaceCount() { return faceCount; },

        onFaceDetected(cb) { callbacks.faceDetected.push(cb); },
        onFaceLost(cb) { callbacks.faceLost.push(cb); },
        onMultipleFaces(cb) { callbacks.multipleFaces.push(cb); },
        onFrameTick(cb) { callbacks.frameTick.push(cb); },
    };

    console.log("[Camera] Ready");
})();