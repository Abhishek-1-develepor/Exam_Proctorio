/**
 * register.js — Register page logic (safely handles null elements).
 */

(function () {
    function init() {
        // ---------- Elements ----------
        const video = document.getElementById("video");
        const faceGuide = document.getElementById("faceGuide");
        const statusBadge = document.getElementById("statusBadge");
        const startCamBtn = document.getElementById("startCam");
        const registerBtn = document.getElementById("registerBtn");
        const messageEl = document.getElementById("message");
        const studentIdEl = document.getElementById("studentId");
        const fullNameEl = document.getElementById("fullName");
        const emailEl = document.getElementById("email");

        // If this is not the register page, exit silently
        if (!video || !startCamBtn || !registerBtn || !studentIdEl || !fullNameEl) {
            return;
        }

        let faceReady = false;

        // ---------- Start Camera ----------
        startCamBtn.addEventListener("click", async () => {
            try {
                statusBadge.textContent = "Starting...";
                await window.pvCamera.start(video);
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

        // ---------- Enable/disable button ----------
        [studentIdEl, fullNameEl].forEach((el) => {
            el.addEventListener("input", updateRegisterButton);
        });

        function updateRegisterButton() {
            const idOk = studentIdEl.value.trim().length > 0;
            const nameOk = fullNameEl.value.trim().length > 0;
            registerBtn.disabled = !(faceReady && idOk && nameOk);
        }

        // ---------- Register ----------
        registerBtn.addEventListener("click", async () => {
            const studentId = studentIdEl.value.trim();
            const name = fullNameEl.value.trim();
            const email = emailEl ? emailEl.value.trim() : "";

            if (!studentId || !name) {
                showMessage("Fill ID and name first", "error");
                return;
            }
            if (!faceReady) {
                showMessage("Face not ready", "error");
                return;
            }

            const frame = window.pvCamera.capture();
            if (!frame) {
                showMessage("Could not capture frame", "error");
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = "Registering...";
            showMessage("Uploading face...", "info");

            try {
                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: frame, student_id: studentId, name, email }),
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

    // Boot only when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();/**
 * register.js — Register page logic (safely handles null elements).
 */

(function () {
    function init() {
        // ---------- Elements ----------
        const video = document.getElementById("video");
        const faceGuide = document.getElementById("faceGuide");
        const statusBadge = document.getElementById("statusBadge");
        const startCamBtn = document.getElementById("startCam");
        const registerBtn = document.getElementById("registerBtn");
        const messageEl = document.getElementById("message");
        const studentIdEl = document.getElementById("studentId");
        const fullNameEl = document.getElementById("fullName");
        const emailEl = document.getElementById("email");

        // If this is not the register page, exit silently
        if (!video || !startCamBtn || !registerBtn || !studentIdEl || !fullNameEl) {
            return;
        }

        let faceReady = false;

        // ---------- Start Camera ----------
        startCamBtn.addEventListener("click", async () => {
            try {
                statusBadge.textContent = "Starting...";
                await window.pvCamera.start(video);
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

        // ---------- Enable/disable button ----------
        [studentIdEl, fullNameEl].forEach((el) => {
            el.addEventListener("input", updateRegisterButton);
        });

        function updateRegisterButton() {
            const idOk = studentIdEl.value.trim().length > 0;
            const nameOk = fullNameEl.value.trim().length > 0;
            registerBtn.disabled = !(faceReady && idOk && nameOk);
        }

        // ---------- Register ----------
        registerBtn.addEventListener("click", async () => {
            const studentId = studentIdEl.value.trim();
            const name = fullNameEl.value.trim();
            const email = emailEl ? emailEl.value.trim() : "";

            if (!studentId || !name) {
                showMessage("Fill ID and name first", "error");
                return;
            }
            if (!faceReady) {
                showMessage("Face not ready", "error");
                return;
            }

            const frame = window.pvCamera.capture();
            if (!frame) {
                showMessage("Could not capture frame", "error");
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = "Registering...";
            showMessage("Uploading face...", "info");

            try {
                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: frame, student_id: studentId, name, email }),
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

    // Boot only when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();