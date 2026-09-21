/* ProctorVision — Login page logic */

(function () {
    function init() {
        const tabs = document.querySelectorAll(".tab");
        const tabContents = document.querySelectorAll(".tab-content");
        const video = document.getElementById("video");
        const faceGuide = document.getElementById("faceGuide");
        const statusBadge = document.getElementById("statusBadge");
        const startCamBtn = document.getElementById("startCam");
        const verifyBtn = document.getElementById("verifyBtn");
        const messageEl = document.getElementById("message");
        const adminPassword = document.getElementById("adminPassword");
        const adminLoginBtn = document.getElementById("adminLoginBtn");
        const adminMessage = document.getElementById("adminMessage");

        // Exit if not login page
        if (!document.getElementById("login-tab") || !video || !startCamBtn) {
            return;
        }

        // ---------- Tabs ----------
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tabContents.forEach((c) => c.classList.remove("active"));
                tab.classList.add("active");
                const target = document.getElementById(`${tab.dataset.tab}-tab`);
                if (target) target.classList.add("active");
                window.pvSound?.play("tick");
            });
        });

        // ---------- Start Camera ----------
        startCamBtn.addEventListener("click", async () => {
            try {
                statusBadge.textContent = "Starting...";

                await window.pvCamera.start(video);

                // Hide GIF placeholder + force video visible
                const placeholder = document.getElementById("cameraPlaceholder");
                if (placeholder) placeholder.classList.add("hidden");
                video.classList.add("active");

                faceGuide.classList.add("active");
                startCamBtn.disabled = true;
                startCamBtn.textContent = "Camera Active";
                statusBadge.textContent = "Looking for face...";
                window.pvSound?.play("beep");

                window.pvCamera.onFaceDetected(() => {
                    statusBadge.textContent = "Face detected";
                    statusBadge.classList.add("detected");
                    verifyBtn.disabled = false;
                });

                window.pvCamera.onFaceLost(() => {
                    statusBadge.textContent = "No face detected";
                    statusBadge.classList.remove("detected");
                    verifyBtn.disabled = true;
                });

                window.pvCamera.onMultipleFaces((d) => {
                    statusBadge.textContent = `${d.count} faces detected`;
                    statusBadge.classList.remove("detected");
                    verifyBtn.disabled = true;
                    showMessage("Only one person allowed", "error");
                });
            } catch (err) {
                console.error("[Login] Camera error:", err);
                statusBadge.textContent = "Camera failed";
                showMessage(err.message || "Camera access denied", "error");
                window.pvSound?.play("error");
            }
        });

        // ---------- Verify & Login ----------
        verifyBtn.addEventListener("click", async () => {
            if (!window.pvCamera.isReady()) return;

            const frame = window.pvCamera.capture();
            if (!frame) {
                showMessage("Could not capture frame", "error");
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.textContent = "Verifying...";
            showMessage("Comparing face...", "info");

            try {
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: frame }),
                });
                const data = await res.json();

                if (data.success) {
                    window.pvSound?.play("success");
                    showMessage(`Welcome, ${data.student.name}`, "success");
                    setTimeout(() => (window.location.href = "/session"), 900);
                } else {
                    window.pvSound?.play("error");
                    showMessage(data.error || "Login failed", "error");
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = "Verify & Login";
                }
            } catch (err) {
                console.error("[Login]", err);
                window.pvSound?.play("error");
                showMessage("Network error", "error");
                verifyBtn.disabled = false;
                verifyBtn.textContent = "Verify & Login";
            }
        });

        // ---------- Admin Login ----------
        if (adminLoginBtn && adminPassword) {
            adminLoginBtn.addEventListener("click", async () => {
                const password = adminPassword.value.trim();
                if (!password) {
                    adminMessage.textContent = "Enter password";
                    adminMessage.className = "msg error";
                    return;
                }

                adminLoginBtn.disabled = true;
                adminLoginBtn.textContent = "Logging in...";

                try {
                    const res = await fetch("/api/admin/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password }),
                    });
                    const data = await res.json();

                    if (data.success) {
                        window.pvSound?.play("success");
                        adminMessage.textContent = "Login successful";
                        adminMessage.className = "msg success";
                        setTimeout(() => (window.location.href = "/admin/dashboard"), 700);
                    } else {
                        window.pvSound?.play("error");
                        adminMessage.textContent = data.error || "Login failed";
                        adminMessage.className = "msg error";
                        adminLoginBtn.disabled = false;
                        adminLoginBtn.textContent = "Login as Admin";
                    }
                } catch (err) {
                    console.error("[Login/Admin]", err);
                    adminMessage.textContent = "Network error";
                    adminMessage.className = "msg error";
                    adminLoginBtn.disabled = false;
                    adminLoginBtn.textContent = "Login as Admin";
                }
            });

            adminPassword.addEventListener("keydown", (e) => {
                if (e.key === "Enter") adminLoginBtn.click();
            });
        }

        // ---------- Helper ----------
        function showMessage(text, type = "") {
            if (!messageEl) return;
            messageEl.textContent = text;
            messageEl.className = "msg " + type;
        }

        document.body.addEventListener("click", () => window.pvSound?.unlock(), { once: true });

        console.log("[Login] Ready");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();