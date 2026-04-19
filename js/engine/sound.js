let audioCtx = null;
let enabled = true;
let bgNodes = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a gain node with an initial volume that fades to silence. */
function makeGain(ctx, startTime, volume, fadeEnd) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, fadeEnd);
    return g;
}

/** Play a single oscillator tone through an optional chain of AudioNodes. */
function tone(ctx, freq, start, dur, type = 'sine', vol = 0.2, chain = []) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = makeGain(ctx, start, vol, start + dur);
    let prev = osc;
    for (const node of chain) {
        prev.connect(node);
        prev = node;
    }
    prev.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
}

/** Play a short burst of filtered noise (useful for percussive textures). */
function noiseBurst(ctx, start, dur, vol, filterFreq, filterType = 'bandpass') {
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.0;

    const gain = makeGain(ctx, start, vol, start + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(start);
    src.stop(start + dur);
    return { filter, gain };
}

// ---------------------------------------------------------------------------
// Correct  --  bright cheerful C major chord strum with sparkle
// ---------------------------------------------------------------------------
export function correct() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // C-E-G major chord as a quick rising strum
    const chord = [523.25, 659.25, 783.99]; // C5 E5 G5
    const strumDelay = 0.045; // slight strum spacing

    chord.forEach((freq, i) => {
        const t = now + i * strumDelay;

        // Main tone (warm sine)
        tone(ctx, freq, t, 0.4, 'sine', 0.18);

        // Harmonic layer for richness (triangle, slightly detuned)
        tone(ctx, freq * 1.002, t, 0.35, 'triangle', 0.08);
    });

    // Sparkle: high-frequency harmonic plinks
    const sparkleFreqs = [2093, 2637, 3136]; // C7 E7 G7
    sparkleFreqs.forEach((freq, i) => {
        const t = now + 0.08 + i * 0.04;
        tone(ctx, freq, t, 0.15, 'sine', 0.06);
    });
}

// ---------------------------------------------------------------------------
// Wrong  --  soft underwater bubble pop  (NOT punishing)
// ---------------------------------------------------------------------------
export function wrong() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Descending "bloop" tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Filtered noise bubble texture
    noiseBurst(ctx, now, 0.12, 0.06, 600, 'bandpass');
}

// ---------------------------------------------------------------------------
// Star  --  three ascending dings like collecting coins
// ---------------------------------------------------------------------------
export function star() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Three ascending dings  (E6 -> A6 -> C#7)
    const dings = [1318.5, 1760, 2217.5];
    const spacing = 0.1;

    dings.forEach((freq, i) => {
        const t = now + i * spacing;

        // Bright metallic ding (sine + triangle layered)
        tone(ctx, freq, t, 0.25, 'sine', 0.18);
        tone(ctx, freq * 2.0, t, 0.12, 'sine', 0.05); // octave shimmer

        // Subtle triangle body
        tone(ctx, freq * 0.5, t, 0.18, 'triangle', 0.06);
    });
}

// ---------------------------------------------------------------------------
// Tap  --  soft bubbly blip
// ---------------------------------------------------------------------------
export function tap() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Quick filtered sine blip
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
}

// ---------------------------------------------------------------------------
// Achievement  --  full celebration fanfare, C major arpeggio up 2 octaves
// ---------------------------------------------------------------------------
export function achievement() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // C major arpeggio spanning two octaves
    const notes = [
        523.25,  // C5
        659.25,  // E5
        783.99,  // G5
        1046.50, // C6
        1318.51, // E6
        1567.98, // G6
        2093.00  // C7
    ];
    const noteSpacing = 0.09;

    notes.forEach((freq, i) => {
        const t = now + i * noteSpacing;
        const vol = 0.14 + (i / notes.length) * 0.06; // crescendo

        // Main sine tone
        tone(ctx, freq, t, 0.5, 'sine', vol);

        // Warm triangle layer, slightly detuned
        tone(ctx, freq * 1.003, t, 0.45, 'triangle', vol * 0.35);

        // Top octave shimmer on the last three notes
        if (i >= notes.length - 3) {
            tone(ctx, freq * 2, t, 0.25, 'sine', 0.04);
        }
    });

    // Final chord sustain (C-E-G at the top octave)
    const chordTime = now + notes.length * noteSpacing + 0.02;
    [2093, 2637, 3136].forEach((freq) => {
        tone(ctx, freq, chordTime, 0.4, 'sine', 0.06);
    });
}

// ---------------------------------------------------------------------------
// Streak Chime  --  correct sound pitched up by streak count
// ---------------------------------------------------------------------------
export function streakChime(streakCount = 1) {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Pitch multiplier: streak 1 = normal, each additional streak raises ~a semitone
    const mult = Math.pow(2, Math.min(streakCount - 1, 8) / 12);

    const chord = [523.25 * mult, 659.25 * mult, 783.99 * mult];
    const strumDelay = 0.04;

    chord.forEach((freq, i) => {
        const t = now + i * strumDelay;
        tone(ctx, freq, t, 0.35, 'sine', 0.18);
        tone(ctx, freq * 1.002, t, 0.3, 'triangle', 0.07);
    });

    // Sparkle pitched up too
    const sparkle = [2093 * mult, 2637 * mult, 3136 * mult];
    sparkle.forEach((freq, i) => {
        const t = now + 0.06 + i * 0.035;
        tone(ctx, freq, t, 0.12, 'sine', 0.05);
    });
}

// ---------------------------------------------------------------------------
// Splash  --  water splash for wrong answers
// ---------------------------------------------------------------------------
export function splash() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Quick downward pitch sweep
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise splash texture
    noiseBurst(ctx, now, 0.2, 0.08, 1200, 'bandpass');
    noiseBurst(ctx, now + 0.05, 0.15, 0.05, 500, 'lowpass');
}

// ---------------------------------------------------------------------------
// Whoosh  --  quick swoosh for screen transitions
// ---------------------------------------------------------------------------
export function whoosh() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Filtered noise sweep low -> high
    const sr = ctx.sampleRate;
    const dur = 0.2;
    const len = Math.ceil(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + dur);
}

// ---------------------------------------------------------------------------
// Drop  --  satisfying click for drag-and-drop landing
// ---------------------------------------------------------------------------
export function drop() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Short sine burst with quick decay
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

// ---------------------------------------------------------------------------
// Coin Collect  --  quick bright ascending blip
// ---------------------------------------------------------------------------
export function coinCollect() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Fast ascending two-note blip, higher register than correct()
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(2800, now + 0.08);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Shimmer overtone
    tone(ctx, 3500, now + 0.03, 0.1, 'sine', 0.05);
}

// ---------------------------------------------------------------------------
// Timeout  --  gentle descending chime for lockout transition (NOT harsh)
// ---------------------------------------------------------------------------
export function timeout() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Descending major triad: G5 -> E5 -> C5 (soft, not alarming)
    const notes = [783.99, 659.25, 523.25];
    const spacing = 0.22;

    notes.forEach((freq, i) => {
        const t = now + i * spacing;
        tone(ctx, freq, t, 0.6, 'sine', 0.14);
        tone(ctx, freq * 0.5, t, 0.5, 'triangle', 0.05);
    });
}

// ---------------------------------------------------------------------------
// Background Music  --  calm underwater ambient loop
// ---------------------------------------------------------------------------
export function bgMusic(playing) {
    if (!enabled && playing) return;
    const ctx = getCtx();

    // Stop existing background if any
    if (bgNodes) {
        try {
            bgNodes.forEach(n => {
                if (n.stop) n.stop();
                if (n.disconnect) n.disconnect();
            });
        } catch (_) { /* already stopped */ }
        bgNodes = null;
    }

    if (!playing) return;

    const now = ctx.currentTime;
    const nodesToTrack = [];

    // Master gain for the whole background (very quiet)
    const master = ctx.createGain();
    master.gain.value = 0.06;
    master.connect(ctx.destination);
    nodesToTrack.push(master);

    // Two detuned low-frequency sine drones
    const drone1 = ctx.createOscillator();
    drone1.type = 'sine';
    drone1.frequency.value = 110;
    const drone1Gain = ctx.createGain();
    drone1Gain.gain.value = 0.5;

    const drone2 = ctx.createOscillator();
    drone2.type = 'sine';
    drone2.frequency.value = 165; // a fifth above, slightly detuned feeling
    const drone2Gain = ctx.createGain();
    drone2Gain.gain.value = 0.3;

    // LFO to gently modulate drone1 volume
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // very slow wobble
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(drone1Gain.gain);

    // LFO2 for drone2
    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.1;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 0.1;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(drone2Gain.gain);

    // Low-pass filter to keep drones warm
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 300;

    drone1.connect(drone1Gain);
    drone2.connect(drone2Gain);
    drone1Gain.connect(droneFilter);
    drone2Gain.connect(droneFilter);
    droneFilter.connect(master);

    drone1.start(now);
    drone2.start(now);
    lfo.start(now);
    lfo2.start(now);

    nodesToTrack.push(drone1, drone2, lfo, lfo2);
    nodesToTrack.push(drone1Gain, drone2Gain, lfoGain, lfo2Gain, droneFilter);

    // Occasional high bubble plinks via a scheduled interval
    let bubbleTimer = null;
    function scheduleBubble() {
        if (!bgNodes) return; // stopped
        const bCtx = getCtx();
        const t = bCtx.currentTime;

        const freq = 1200 + Math.random() * 1800; // random high plink
        const osc = bCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.15);

        const g = bCtx.createGain();
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + 0.2);

        // Next bubble in 2-5 seconds (random)
        const next = 2000 + Math.random() * 3000;
        bubbleTimer = setTimeout(scheduleBubble, next);
    }

    // Start first bubble after a short delay
    bubbleTimer = setTimeout(scheduleBubble, 1500);

    // Store a cleanup handle for the bubble timer
    const timerHandle = {
        stop() { clearTimeout(bubbleTimer); },
        disconnect() { clearTimeout(bubbleTimer); }
    };
    nodesToTrack.push(timerHandle);

    bgNodes = nodesToTrack;
}

// ---------------------------------------------------------------------------
// Enable / Disable
// ---------------------------------------------------------------------------
export function setEnabled(on) {
    enabled = on;
    // Stop background music when sound is disabled
    if (!on && bgNodes) {
        bgMusic(false);
    }
}

export function isEnabled() {
    return enabled;
}
