/**
 * register.js — Register page (browser-side face encoding).
 */

(function () {
    function init() {
        const video = document.getElementById("video");
        const faceGuide = document.getElementById("faceGuide");
        const statusBadge = document.getElementById("statusBadge");
        const startCamBtn = document.getElementById("startCam");
        const registerBtn = document.getElementById("registerBtn");
        const messageEl = document.getElementById("message");
        const studentIdEl = document.getElementById("studentId");
        const fullNameEl = document.getElementById("fullName");
        const emailEl = document.getElementById("email");

        if (!video || !startCamBtn || !registerBtn) return;

        let faceReady = false;

        startCamBtn.addEventListener("click", async () => {
            try {
                statusBadge.textContent = "Starting...";
                await window.pvCamera.start(video);

                const placeholder = document.getElementById("cameraPlaceholder");
                if (placeholder) placeholder.classList.add("hidden");
                video.classList.add("active");

                faceGuide.classList.add("active");
                startCamBtn.disabled = true;
                startCamBtn.textContent = "Camera Active";
                statusBadge.textContent = "Looking for face...";

                window.pvCamera.onFaceDetected(() => {
                    faceReady = true;
                    statusBadge.textContent = "Face detected";
                    statusBadge.classList.add("detected");
                    updateRegisterButton();
                });

                window.pvCamera.onFaceLost(() => {
                    faceReady = false;
                    statusBadge.textContent = "No face detected";
                    statusBadge.classList.remove("detected");
                    updateRegisterButton();
                });
            } catch (err) {
                console.error("[Register]", err);
                statusBadge.textContent = "Camera failed";
                showMessage(err.message || "Camera error", "error");
            }
        });

        [studentIdEl, fullNameEl].forEach((el) => {
            el.addEventListener("input", updateRegisterButton);
        });

        function updateRegisterButton() {
            const idOk = studentIdEl.value.trim().length > 0;
            const nameOk = fullNameEl.value.trim().length > 0;
            registerBtn.disabled = !(faceReady && idOk && nameOk);
        }

        registerBtn.addEventListener("click", async () => {
            const studentId = studentIdEl.value.trim();
            const name = fullNameEl.value.trim();
            const email = emailEl ? emailEl.value.trim() : "";

            if (!studentId || !name) {
                showMessage("Fill ID and name", "error");
                return;
            }
            if (!faceReady) {
                showMessage("Face not ready", "error");
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = "Extracting face...";
            showMessage("Processing...", "info");

            try {
                // Extract encoding in the browser
                const result = await window.pvFace.extractEncoding(video);
                if (!result.success) {
                    window.pvSound?.play("error");
                    showMessage(result.error, "error");
                    registerBtn.disabled = false;
                    registerBtn.textContent = "Register Face";
                    return;
                }

                registerBtn.textContent = "Registering...";

                // Send encoding + image to server
                const imageB64 = window.pvCamera.capture();

                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        encoding: result.encoding,
                        image: imageB64,
                        student_id: studentId,
                        name: name,
                        email: email,
                    }),
                });

                const data = await res.json();

                if (data.success) {
                    window.pvSound?.play("success");
                    showMessage(data.message || "Registered!", "success");
                    setTimeout(() => (window.location.href = "/login"), 1200);
                } else {
                    window.pvSound?.play("error");
                    showMessage(data.error || "Registration failed", "error");
                    registerBtn.disabled = false;
                    registerBtn.textContent = "Register Face";
                }
            } catch (err) {
                console.error(err);
                window.pvSound?.play("error");
                showMessage("Network error", "error");
                registerBtn.disabled = false;
                registerBtn.textContent = "Register Face";
            }
        });

        function showMessage(text, type = "") {
            if (!messageEl) return;
            messageEl.textContent = text;
            messageEl.className = "msg " + type;
        }

        document.body.addEventListener("click", () => window.pvSound?.unlock(), { once: true });

        console.log("[Register] Ready");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();