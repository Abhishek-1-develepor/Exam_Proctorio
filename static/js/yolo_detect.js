/**
 * yolo_detect.js — Send frames to /api/detect periodically.
 *
 * Exposes: window.pvDetect
 * Emits: "detection-result" event on window.
 */

(function () {
    let intervalId = null;
    let videoEl = null;
    let canvasEl = null;

    function captureFrame() {
        if (!videoEl || !videoEl.videoWidth) return null;
        if (!canvasEl) canvasEl = document.createElement("canvas");
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        canvasEl.getContext("2d").drawImage(videoEl, 0, 0);
        return canvasEl.toDataURL("image/jpeg", 0.7);
    }

    async function detectOnce() {
        const frame = captureFrame();
        if (!frame) return null;

        try {
            const res = await fetch("/api/detect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ frame }),
            });
            const data = await res.json();
            if (data.success) {
                window.dispatchEvent(new CustomEvent("detection-result", { detail: data }));
                return data;
            }
        } catch (e) {
            console.warn("[Detect]", e);
        }
        return null;
    }

    window.pvDetect = {
        start(video, intervalMs = 2000) {
            videoEl = video;
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(detectOnce, intervalMs);
            console.log(`[Detect] Started (${intervalMs}ms)`);
        },
        stop() {
            if (intervalId) clearInterval(intervalId);
            intervalId = null;
            console.log("[Detect] Stopped");
        },
        detectOnce,
    };

    console.log("[Detect] Ready");
})();