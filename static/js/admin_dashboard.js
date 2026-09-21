/* ProctorVision — Admin dashboard logic */

(function () {
    const statStudents = document.getElementById("statStudents");
    const statLogins = document.getElementById("statLogins");
    const statViolations = document.getElementById("statViolations");
    const stat24h = document.getElementById("stat24h");
    const violationList = document.getElementById("violationList");
    const violationCount = document.getElementById("violationCount");
    const loginList = document.getElementById("loginList");

    function fmtTime(iso) {
        if (!iso) return "—";
        try {
            const d = new Date(iso.replace(" ", "T") + "Z");
            return d.toLocaleString("en-IN", {
                month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
        } catch (e) { return iso; }
    }

    function shortId(id) {
        return id ? id : "—";
    }

    async function loadStats() {
        try {
            const res = await fetch("/api/stats");
            const data = await res.json();
            if (data.success) {
                statStudents.textContent = data.stats.total_students;
                statLogins.textContent = data.stats.total_logins;
                statViolations.textContent = data.stats.total_violations;
                stat24h.textContent = data.stats.violations_24h;
            }
        } catch (e) { console.error("[Stats]", e); }
    }

    async function loadViolations() {
        try {
            const res = await fetch("/api/violations");
            const data = await res.json();
            if (!data.success) return;

            const list = data.violations || [];
            violationCount.textContent = list.length;

            if (list.length === 0) {
                violationList.innerHTML = `<li class="empty">No violations recorded</li>`;
                return;
            }

            violationList.innerHTML = list.map((v) => `
                <li>
                    <div class="v-info">
                        <span class="v-type">${v.violation_type || "unknown"}</span>
                        <span class="v-student">${shortId(v.student_id)}</span>
                    </div>
                    <div style="display:flex;gap:12px;align-items:center;">
                        <span class="v-conf">${v.confidence ? (v.confidence * 100).toFixed(0) + "%" : ""}</span>
                        <span class="v-time">${fmtTime(v.timestamp)}</span>
                    </div>
                </li>
            `).join("");
        } catch (e) { console.error("[Violations]", e); }
    }

    async function loadLogins() {
    try {
        const res = await fetch("/api/login_logs");
        const data = await res.json();
        if (!data.success) return;

        const list = data.logs || [];
        if (list.length === 0) {
            loginList.innerHTML = `<li class="empty">No activity</li>`;
            return;
        }

        loginList.innerHTML = list.map((l) => {
            const initial = (l.student_id || "?").slice(0, 1).toUpperCase();
            const imgHtml = l.image_path
                ? `<img class="login-thumb"
                         src="/uploads/${l.image_path}"
                         alt="${l.student_id || 'login'}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
                   <div class="login-thumb placeholder" style="display:none;">${initial}</div>`
                : `<div class="login-thumb placeholder">${initial}</div>`;

            return `
                <li class="login-item">
                    <div class="login-thumb-wrap">
                        ${imgHtml}
                    </div>
                    <div class="login-info">
                        <div class="l-student">${shortId(l.student_id)}</div>
                        <div class="v-time">${fmtTime(l.timestamp)}</div>
                    </div>
                    <span class="l-status ${l.success ? 'success' : 'fail'}">
                        ${l.success ? "OK" : "FAIL"}
                    </span>
                </li>
            `;
        }).join("");
    } catch (e) { console.error("[Logs]", e); }
}

    async function refreshAll() {
        await Promise.all([loadStats(), loadViolations(), loadLogins()]);
    }

    refreshAll();
    setInterval(refreshAll, 5000);

    // Sound on new violation
    let lastViolationCount = 0;
    setInterval(async () => {
        try {
            const res = await fetch("/api/violations");
            const data = await res.json();
            if (data.success && data.violations) {
                const count = data.violations.length;
                if (count > lastViolationCount && lastViolationCount > 0) {
                    window.pvSound?.play("warning");
                }
                lastViolationCount = count;
            }
        } catch (e) {}
    }, 8000);

    console.log("[Dashboard] Ready");
})();