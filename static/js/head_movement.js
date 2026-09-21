/**
 * head_movement.js — MediaPipe FaceMesh head tracking.
 *
 * Detects:
 *   - yaw_away       (head turned > 25°)
 *   - head_down      (pitch < -18°)
 *   - head_up        (pitch > 22°)
 *   - head_tilt      (roll > 20°)
 *   - no_face        (no face for 1.5s)
 *   - multiple_faces (>1 face)
 *
 * Exposes: window.pvHead
 * Emits: "head-metrics" and "head-violation" events on window.
 */

import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

(function () {
    const THRESHOLDS = {
        yaw: 25,
        pitch_down: 18,
        pitch_up: 22,
        roll: 20,
        noFaceMs: 1500,
        sustainedMs: 1000,
    };

    let landmarker = null;
    let videoEl = null;
    let loopId = null;
    let lastVideoTime = -1;
    let running = false;

    const startTimes = { yaw: null, pitch_down: null, pitch_up: null, roll: null, no_face: null };
    const active = new Set();

    function emitViolation(name, action, extra = {}) {
        window.dispatchEvent(new CustomEvent("head-violation", {
            detail: { type: name, action, ...extra }
        }));
    }

    function check(name, condition) {
        const now = performance.now();
        if (condition) {
            if (startTimes[name] === null) startTimes[name] = now;
            else if (now - startTimes[name] > THRESHOLDS.sustainedMs && !active.has(name)) {
                active.add(name);
                emitViolation(name, "start");
            }
        } else {
            startTimes[name] = null;
            if (active.has(name)) {
                active.delete(name);
                emitViolation(name, "end");
            }
        }
    }

    function matrixToAngles(m) {
        const m00 = m[0], m10 = m[1], m20 = m[2];
        const m21 = m[6], m22 = m[10];
        const sy = Math.sqrt(m00 * m00 + m10 * m10);
        const singular = sy < 1e-6;
        let pitch, yaw, roll;
        if (!singular) {
            pitch = Math.atan2(m21, m22);
            yaw = Math.atan2(-m20, sy);
            roll = Math.atan2(m10, m00);
        } else {
            pitch = Math.atan2(-m[9], m[5]);
            yaw = Math.atan2(-m20, sy);
            roll = 0;
        }
        const deg = 180 / Math.PI;
        return { yaw: -yaw * deg, pitch: -pitch * deg, roll: roll * deg };
    }

    async function init() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 3,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
        });
        console.log("[Head] FaceLandmarker ready");
    }

    function loop() {
        if (!running || !videoEl || videoEl.readyState < 2) {
            loopId = requestAnimationFrame(loop);
            return;
        }

        if (videoEl.currentTime !== lastVideoTime) {
            lastVideoTime = videoEl.currentTime;
            const res = landmarker.detectForVideo(videoEl, performance.now());
            const faces = res.faceLandmarks?.length || 0;

            if (faces === 0) {
                check("no_face", true);
                check("yaw", false);
                check("pitch_down", false);
                check("pitch_up", false);
                check("roll", false);
                window.dispatchEvent(new CustomEvent("head-metrics", {
                    detail: { yaw: 0, pitch: 0, roll: 0, faces: 0 }
                }));
            } else {
                check("no_face", false);

                if (faces > 1) {
                    if (!active.has("multiple_faces")) {
                        active.add("multiple_faces");
                        emitViolation("multiple_faces", "start", { count: faces });
                    }
                } else if (active.has("multiple_faces")) {
                    active.delete("multiple_faces");
                    emitViolation("multiple_faces", "end");
                }

                let yaw = 0, pitch = 0, roll = 0;
                if (res.facialTransformationMatrixes?.length) {
                    const m = res.facialTransformationMatrixes[0].data;
                    const a = matrixToAngles(m);
                    yaw = a.yaw; pitch = a.pitch; roll = a.roll;
                }

                check("yaw", Math.abs(yaw) > THRESHOLDS.yaw);
                check("pitch_down", pitch < -THRESHOLDS.pitch_down);
                check("pitch_up", pitch > THRESHOLDS.pitch_up);
                check("roll", Math.abs(roll) > THRESHOLDS.roll);

                window.dispatchEvent(new CustomEvent("head-metrics", {
                    detail: { yaw, pitch, roll, faces }
                }));
            }
        }

        loopId = requestAnimationFrame(loop);
    }

    window.pvHead = {
        async start(videoElement) {
            videoEl = videoElement;
            if (!landmarker) await init();
            running = true;
            lastVideoTime = -1;
            loop();
            console.log("[Head] Tracking started");
        },
        stop() {
            running = false;
            if (loopId) { cancelAnimationFrame(loopId); loopId = null; }
            active.clear();
            for (const k in startTimes) startTimes[k] = null;
        },
        getActive() { return Array.from(active); },
    };

    console.log("[Head] Ready");
})();