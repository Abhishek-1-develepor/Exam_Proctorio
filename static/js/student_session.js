/**
 * student_session.js — Student exam session orchestrator.
 * WITH duplicate submission protection.
 */

(function () {
    // ════════════════════════════════════════════════════════════
    // EXAM QUESTIONS DATA
    // ════════════════════════════════════════════════════════════
    const EXAM_QUESTIONS = [
        {
            question: "What is the output of: print(2 + 3 * 4)?",
            options: ["14", "20", "24", "32"],
            answer: "A",
        },
        {
            question: "Which data structure follows LIFO order?",
            options: ["Queue", "Stack", "Array", "Linked List"],
            answer: "B",
        },
        {
            question: "What does HTML stand for?",
            options: [
                "Hyper Text Markup Language",
                "High Tech Modern Language",
                "Hyper Transfer Markup Language",
                "Home Tool Markup Language",
            ],
            answer: "A",
        },
        {
            question: "Which of these is NOT a Python data type?",
            options: ["List", "Tuple", "Array", "Dictionary"],
            answer: "C",
        },
        {
            question: "Time complexity of binary search?",
            options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
            answer: "B",
        },
    ];

    // ════════════════════════════════════════════════════════════
    // DOM REFERENCES
    // ════════════════════════════════════════════════════════════
    const video = document.getElementById("video");
    const statusBadge = document.getElementById("statusBadge");
    const mYaw = document.getElementById("mYaw");
    const mPitch = document.getElementById("mPitch");
    const mRoll = document.getElementById("mRoll");
    const mFaces = document.getElementById("mFaces");
    const eventList = document.getElementById("eventList");
    const violationCount = document.getElementById("violationCount");
    const sessionTime = document.getElementById("sessionTime");
    const sessionTime2 = document.getElementById("sessionTime2");
    const banner = document.getElementById("violationBanner");
    const bannerText = document.getElementById("violationText");

    // Exam question elements
    const qNumberEl = document.getElementById("qNumber");
    const questionTextEl = document.getElementById("questionText");
    const optionsContainer = document.getElementById("optionsContainer");
    const currentQEl = document.getElementById("currentQ");
    const totalQEl = document.getElementById("totalQ");
    const progressFill = document.getElementById("progressFill");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    let violationTotal = 0;
    let sessionStart = Date.now();
    let bannerTimeout = null;
    let isSubmitting = false;
    let examAlreadySubmitted = false;

    // ════════════════════════════════════════════════════════════
    // DUPLICATE SUBMISSION PROTECTION
    // ════════════════════════════════════════════════════════════

    // Check on page load
    async function checkSubmissionStatus() {
        // 1. Check localStorage
        const localSubmit = localStorage.getItem('exam_submitted_at');
        if (localSubmit) {
            const elapsed = Date.now() - parseInt(localSubmit);
            // If submitted less than 24 hours ago, block
            if (elapsed < 24 * 60 * 60 * 1000) {
                console.log('[Submit] Blocked by localStorage');
                return false;
            }
        }

        // 2. Check backend
        try {
            const response = await fetch('/api/exam/status');
            const data = await response.json();
            if (data.submitted) {
                console.log('[Submit] Blocked by backend');
                localStorage.setItem('exam_submitted_at', Date.now().toString());
                return false;
            }
        } catch (err) {
            console.warn('[Submit] Status check failed:', err);
        }

        return true;
    }

    // ════════════════════════════════════════════════════════════
    // SESSION TIMER
    // ════════════════════════════════════════════════════════════
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const s = String(elapsed % 60).padStart(2, "0");
        const formatted = `${m}:${s}`;
        if (sessionTime) sessionTime.textContent = formatted;
        if (sessionTime2) sessionTime2.textContent = formatted;
    }, 1000);

    // ════════════════════════════════════════════════════════════
    // EVENT LOG
    // ════════════════════════════════════════════════════════════
    function logEvent(type, severity = "warn") {
        if (!eventList) return;

        const now = new Date();
        const time = now.toTimeString().slice(0, 5);

        const empty = eventList.querySelector(".empty");
        if (empty) empty.remove();

        const li = document.createElement("li");
        li.className = severity;
        li.innerHTML = `
            <span class="event-type">${type.replace(/_/g, " ")}</span>
            <span class="event-time">${time}</span>
        `;
        eventList.insertBefore(li, eventList.firstChild);

        while (eventList.children.length > 30) {
            eventList.removeChild(eventList.lastChild);
        }
    }

    function bumpViolation(type, confidence = 0.9) {
        violationTotal++;
        if (violationCount) violationCount.textContent = violationTotal;
        logEvent(type, "danger");
        showBanner(type);
        window.pvSound?.play("warning");

        fetch("/api/violation/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, confidence }),
        }).catch(() => {});
    }

    function showBanner(type) {
        if (!banner || !bannerText) return;

        const messages = {
            yaw: "Looking away from screen",
            pitch_down: "Head down — lift your head",
            pitch_up: "Head up — look at the screen",
            roll: "Head tilted — straighten up",
            no_face: "Face not detected — stay in frame",
            multiple_faces: "Multiple persons detected",
            "cell phone": "Mobile phone detected",
            book: "Unauthorized material detected",
            laptop: "Secondary screen detected",
        };
        bannerText.textContent = messages[type] || `${type.replace(/_/g, " ")} detected`;
        banner.classList.add("show");
        if (bannerTimeout) clearTimeout(bannerTimeout);
        bannerTimeout = setTimeout(() => banner.classList.remove("show"), 3000);
    }

    // ════════════════════════════════════════════════════════════
    // EXAM QUESTIONS MODULE
    // ════════════════════════════════════════════════════════════
    let currentQuestion = 0;
    const answers = {};

    function renderQuestion() {
        if (!questionTextEl || !optionsContainer) return;

        const q = EXAM_QUESTIONS[currentQuestion];
        qNumberEl.textContent = `Question ${currentQuestion + 1}`;
        questionTextEl.textContent = q.question;
        currentQEl.textContent = currentQuestion + 1;

        const progress = ((currentQuestion + 1) / EXAM_QUESTIONS.length) * 100;
        if (progressFill) progressFill.style.width = progress + "%";

        optionsContainer.innerHTML = q.options
            .map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const checked = answers[currentQuestion] === letter ? "checked" : "";
                return `
                    <label class="option">
                        <input type="radio" name="answer" value="${letter}" ${checked}>
                        <span class="option-letter">${letter}</span>
                        <span class="option-text">${opt}</span>
                    </label>
                `;
            })
            .join("");

        optionsContainer.querySelectorAll("input[type='radio']").forEach((input) => {
            input.addEventListener("change", (e) => {
                answers[currentQuestion] = e.target.value;
                window.pvSound?.play("tick");
            });
        });

        if (prevBtn) prevBtn.disabled = currentQuestion === 0;

        if (currentQuestion === EXAM_QUESTIONS.length - 1) {
            if (nextBtn) nextBtn.classList.add("hidden");
            if (submitBtn) submitBtn.classList.remove("hidden");
        } else {
            if (nextBtn) nextBtn.classList.remove("hidden");
            if (submitBtn) submitBtn.classList.add("hidden");
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentQuestion > 0) {
                currentQuestion--;
                renderQuestion();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentQuestion < EXAM_QUESTIONS.length - 1) {
                currentQuestion++;
                renderQuestion();
            }
        });
    }

    // ════════════════════════════════════════════════════════════
    // SUBMIT HANDLER — WITH DUPLICATE PROTECTION
    // ════════════════════════════════════════════════════════════
    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            // ⚠️ Guard 1: Already submitting
            if (isSubmitting) {
                console.log('[Submit] Already submitting, ignoring...');
                return;
            }

            // ⚠️ Guard 2: Already submitted
            if (examAlreadySubmitted) {
                alert('⚠️ Exam already submitted!');
                window.location.href = "/api/logout";
                return;
            }

            // ⚠️ Guard 3: localStorage check
            const localSubmit = localStorage.getItem('exam_submitted_at');
            if (localSubmit) {
                const elapsed = Date.now() - parseInt(localSubmit);
                if (elapsed < 24 * 60 * 60 * 1000) {
                    alert('⚠️ Exam already submitted!');
                    window.location.href = "/api/logout";
                    return;
                }
            }

            const total = EXAM_QUESTIONS.length;
            const answered = Object.keys(answers).length;

            if (answered < total) {
                const confirmed = confirm(
                    `You have answered ${answered}/${total} questions. Submit anyway?`
                );
                if (!confirmed) return;
            }

            // Calculate score
            let score = 0;
            EXAM_QUESTIONS.forEach((q, i) => {
                if (answers[i] === q.answer) score++;
            });

            // ⚠️ Lock submit
            isSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting...";

            try {
                const response = await fetch('/api/exam/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        score: score,
                        total: total,
                        answers: answers,
                        timestamp: new Date().toISOString()
                    })
                });

                const data = await response.json();

                // ⚠️ Handle 409 Already Submitted
                // ⚠️ Fast submit — no alert, no setTimeout
if (response.status === 409) {
    examAlreadySubmitted = true;
    localStorage.setItem('exam_submitted_at', Date.now().toString());
    window.location.href = "/api/logout";  // Immediate
    return;
}

if (!response.ok) {
    throw new Error(data.error || 'Submit failed');
}

// Success — immediate redirect
localStorage.setItem('exam_submitted_at', Date.now().toString());
examAlreadySubmitted = true;

// Optional: show brief banner (no alert)
if (bannerText) bannerText.textContent = `Exam submitted! Score: ${score}/${total}`;
if (banner) banner.classList.add("show");

// Immediate redirect
window.location.href = "/api/logout";

            } catch (err) {
                console.error('[Submit] Failed:', err);
                alert('❌ Submit failed: ' + err.message);

                // Reset on error so user can retry
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Exam";
            }
        });
    }

    // Initialize first question
    if (totalQEl) totalQEl.textContent = EXAM_QUESTIONS.length;
    renderQuestion();

    // ════════════════════════════════════════════════════════════
    // CAMERA + TRACKING BOOT
    // ════════════════════════════════════════════════════════════
    async function boot() {
        try {
            // ⚠️ Check submission status FIRST
            const canProceed = await checkSubmissionStatus();
            if (!canProceed) {
                examAlreadySubmitted = true;
                alert('⚠️ You have already submitted this exam. Redirecting...');
                setTimeout(() => window.location.href = "/api/logout", 1500);
                return;
            }

            if (statusBadge) statusBadge.textContent = "Starting camera...";

            await window.pvCamera.start(video);

            const placeholder = document.getElementById("cameraPlaceholder");
            if (placeholder) placeholder.classList.add("hidden");
            video.classList.add("active");

            window.pvCamera.onFaceDetected(() => {
                if (statusBadge) {
                    statusBadge.textContent = "Monitoring";
                    statusBadge.classList.add("detected");
                }
            });

            window.pvCamera.onFaceLost(() => {
                if (statusBadge) {
                    statusBadge.textContent = "No face";
                    statusBadge.classList.remove("detected");
                }
            });

            if (statusBadge) {
                statusBadge.textContent = "Monitoring";
                statusBadge.classList.add("detected");
            }

            await window.pvHead.start(video);
            window.pvDetect.start(video, 2000);

            logEvent("session_started", "warn");
        } catch (err) {
            console.error("[Session] Boot error:", err);
            if (statusBadge) statusBadge.textContent = "Camera failed";
            if (bannerText) bannerText.textContent = err.message || "Camera access denied";
            if (banner) banner.classList.add("show");
        }
    }

    // ════════════════════════════════════════════════════════════
    // LISTENERS
    // ════════════════════════════════════════════════════════════
    window.addEventListener("head-metrics", (e) => {
        const { yaw, pitch, roll, faces } = e.detail;
        if (mYaw) mYaw.textContent = `${yaw.toFixed(0)}°`;
        if (mPitch) mPitch.textContent = `${pitch.toFixed(0)}°`;
        if (mRoll) mRoll.textContent = `${roll.toFixed(0)}°`;
        if (mFaces) mFaces.textContent = faces;
    });

    window.addEventListener("head-violation", (e) => {
        if (e.detail.action === "start") {
            bumpViolation(e.detail.type, 0.9);
        }
    });

    window.addEventListener("detection-result", (e) => {
        const { summary } = e.detail;
        if (summary?.violations?.length > 0) {
            summary.violations.forEach((v) => {
                const key = `__last_${v.class}`;
                const now = Date.now();
                if (!window[key] || now - window[key] > 5000) {
                    window[key] = now;
                    bumpViolation(v.class, v.confidence);
                }
            });
        }
    });

    // ════════════════════════════════════════════════════════════
    // START
    // ════════════════════════════════════════════════════════════
    if (document.readyState === "loading") {
        window.addEventListener("load", boot);
    } else {
        boot();
    }
})();