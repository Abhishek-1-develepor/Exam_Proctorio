/* ProctorVision — Alert sounds via Web Audio API */

(function () {
    let audioCtx = null;

    function getCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }

    function tone(freq, duration, volume, type = "sine", startAt = 0) {
        const ctx = getCtx();
        const now = ctx.currentTime + startAt;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.setValueAtTime(volume, now + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.05);
    }

    const sounds = {
        success() { tone(660, 0.12, 0.15); tone(990, 0.20, 0.15, "sine", 0.13); },
        warning() { tone(220, 0.15, 0.20, "square"); tone(180, 0.15, 0.20, "square", 0.16); },
        beep() { tone(880, 0.08, 0.12); },
        error() { tone(140, 0.30, 0.18, "sawtooth"); },
        tick() { tone(1200, 0.03, 0.08); },
    };

    window.pvSound = {
        play(name) {
            const fn = sounds[name];
            if (typeof fn === "function") {
                try {
                    const ctx = getCtx();
                    if (ctx.state === "suspended") ctx.resume();
                    fn();
                } catch (e) { console.warn(e); }
            }
        },
        unlock() {
            try {
                const ctx = getCtx();
                if (ctx.state === "suspended") ctx.resume();
            } catch (e) {}
        },
    };

    console.log("[Sound] Ready");
})();