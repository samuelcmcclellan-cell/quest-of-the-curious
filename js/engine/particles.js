// ---------------------------------------------------------------------------
//  particles.js  --  Visual effects engine for Quest of the Curious
//  All effects are DOM + CSS based (no Canvas). Every spawned element removes
//  itself after its animation completes to keep the DOM clean.
// ---------------------------------------------------------------------------

// Ocean / coral theme palette
const COLORS = [
    '#FF8A80', // coral
    '#FF7043', // accent
    '#4DD0E1', // ocean-mid
    '#FFD740', // golden-yellow
    '#69F0AE', // seafoam green
    '#CE93D8', // soft purple
    '#FF80AB', // pink
    '#40C4FF', // sky blue
];

const GOLD_COLORS = ['#FFD740', '#FFAB00', '#FFC107', '#FFE082'];

// ---- helpers ---------------------------------------------------------------

/** Inject a <style> block once so every effect has its keyframes available. */
let _stylesInjected = false;
function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    const css = `
/* ---- confetti ----------------------------------------------------------- */
@keyframes confetti-fall-enhanced {
    0%   { transform: translateY(0) rotate(0deg) scale(1);   opacity: 1; }
    80%  { opacity: 1; }
    100% { transform: translateY(100vh) rotate(var(--rot, 720deg)) scale(0.4); opacity: 0; }
}
.confetti-particle {
    position: fixed;
    top: -14px;
    pointer-events: none;
    z-index: 1000;
    animation: confetti-fall-enhanced linear forwards;
}
.confetti-particle.shape-star::after {
    content: '\\2B50';
    font-size: inherit;
}
.confetti-particle.shape-heart::after {
    content: '\\2764';
    font-size: inherit;
}

/* ---- starburst ---------------------------------------------------------- */
@keyframes starburst-fly {
    0%   { transform: translate(0,0) scale(0.3) rotate(0deg); opacity: 1; }
    40%  { transform: translate(var(--dx), var(--dy)) scale(1.3) rotate(180deg); opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) scale(0) rotate(360deg); opacity: 0; }
}
@keyframes starburst-glow-trail {
    0%   { transform: translate(0,0) scale(0.5); opacity: 0.6; }
    60%  { transform: translate(var(--dx), var(--dy)) scale(0.8); opacity: 0.3; }
    100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
}

/* ---- golden glow -------------------------------------------------------- */
@keyframes golden-glow-pulse {
    0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
    40%  { transform: translate(-50%, -50%) scale(1);   opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
}

/* ---- correct overlay text ----------------------------------------------- */
@keyframes correct-zoom {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    30%  { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
    60%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
    100% { transform: translate(-50%, -50%) translateY(-40px) scale(1.1); opacity: 0; }
}
.correct-overlay {
    position: fixed;
    pointer-events: none;
    z-index: 1010;
    font-family: 'Fredoka One', 'Nunito', sans-serif;
    font-size: 2.4rem;
    font-weight: 800;
    color: #FFD740;
    text-shadow: 0 2px 6px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.5);
    animation: correct-zoom 0.9s ease forwards;
}

/* ---- splash / water droplets -------------------------------------------- */
@keyframes splash-drop {
    0%   { transform: translate(0,0) scale(1); opacity: 0.9; }
    60%  { transform: translate(var(--dx), var(--dy)) scale(0.7); opacity: 0.7; }
    100% { transform: translate(var(--dx), calc(var(--dy) + 60px)) scale(0.3); opacity: 0; }
}
@keyframes splash-bubble-up {
    0%   { transform: translate(0,0) scale(0.5); opacity: 0.7; }
    100% { transform: translate(var(--drift), -80px) scale(0.2); opacity: 0; }
}
@keyframes ripple-ring {
    0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0.5; border-width: 3px; }
    100% { transform: translate(-50%, -50%) scale(2.0); opacity: 0; border-width: 1px; }
}

/* ---- streak fire -------------------------------------------------------- */
@keyframes fire-float {
    0%   { transform: translate(0, 0) scale(1);   opacity: 0.9; }
    50%  { transform: translate(var(--drift), -30px) scale(0.7); opacity: 0.7; }
    100% { transform: translate(var(--drift), -60px) scale(0);   opacity: 0; }
}

/* ---- ambient bubbles ---------------------------------------------------- */
@keyframes ambient-bubble-rise {
    0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
    10%  { opacity: 0.5; }
    90%  { opacity: 0.35; }
    100% { transform: translate(var(--drift), -100%) scale(1); opacity: 0; }
}
.ambient-bubble {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(77,208,225,0.25));
    border: 1px solid rgba(255,255,255,0.3);
    animation: ambient-bubble-rise linear forwards;
}

/* ---- ambient fish ------------------------------------------------------- */
@keyframes fish-swim-right {
    0%   { transform: translate(-60px, 0); opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { transform: translate(calc(100% + 60px), var(--wave)); opacity: 0; }
}
@keyframes fish-swim-left {
    0%   { transform: translate(calc(100% + 60px), 0) scaleX(-1); opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { transform: translate(-60px, var(--wave)) scaleX(-1); opacity: 0; }
}
.ambient-fish {
    position: absolute;
    pointer-events: none;
    font-size: 1.8rem;
    z-index: 1;
    animation-timing-function: ease-in-out;
    animation-fill-mode: forwards;
}

/* ---- shimmer stars ------------------------------------------------------ */
@keyframes shimmer-twinkle {
    0%   { transform: translate(var(--sx), var(--sy)) scale(0) rotate(0deg); opacity: 0; }
    30%  { transform: translate(var(--sx), var(--sy)) scale(1) rotate(90deg); opacity: 1; }
    70%  { transform: translate(var(--sx), var(--sy)) scale(0.8) rotate(200deg); opacity: 0.8; }
    100% { transform: translate(var(--sx), var(--sy)) scale(0) rotate(360deg); opacity: 0; }
}
`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

/** Return a random element from an array. */
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Return a random number between min and max. */
function rand(min, max) {
    return min + Math.random() * (max - min);
}

/** Get the center point of an element in viewport coordinates. */
function elCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Auto-remove an element when its animation ends. */
function autoRemove(el) {
    el.addEventListener('animationend', () => el.remove());
}

// ---- public effects --------------------------------------------------------

/**
 * confetti(count)
 * Shower of varied confetti particles across the viewport.
 * Shapes: circles, squares, stars, and hearts with ocean/coral colours.
 */
export function confetti(count = 40) {
    injectStyles();
    const shapes = ['circle', 'square', 'star', 'heart'];

    for (let i = 0; i < count; i++) {
        const shape = pick(shapes);
        const p = document.createElement('div');
        p.className = 'confetti-particle';

        const size = rand(7, 14);
        const color = pick(COLORS);
        const duration = rand(1.6, 3.5);
        const delay = rand(0, 0.6);
        const rotation = Math.random() > 0.5 ? '720deg' : '-720deg';
        const leftPos = rand(2, 98);

        if (shape === 'circle') {
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.borderRadius = '50%';
            p.style.backgroundColor = color;
        } else if (shape === 'square') {
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.borderRadius = '2px';
            p.style.backgroundColor = color;
        } else if (shape === 'star') {
            p.classList.add('shape-star');
            p.style.fontSize = size + 'px';
            p.style.lineHeight = '1';
        } else {
            p.classList.add('shape-heart');
            p.style.fontSize = size + 'px';
            p.style.lineHeight = '1';
            p.style.color = color;
        }

        p.style.left = leftPos + 'vw';
        p.style.setProperty('--rot', rotation);
        p.style.animationDuration = duration + 's';
        p.style.animationDelay = delay + 's';

        document.body.appendChild(p);
        autoRemove(p);
    }
}

/**
 * starBurst(x, y, count)
 * Dramatic burst of stars and sparkles from a point. Stars grow, spin,
 * then shrink and fade. Golden glow trails follow each star.
 */
export function starBurst(x, y, count = 12) {
    injectStyles();

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
        const distance = rand(50, 110);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const dur = rand(0.7, 1.1);

        // Glow trail (spawned first so it renders behind the star)
        const trail = document.createElement('div');
        trail.style.cssText = `
            position:fixed; left:${x}px; top:${y}px;
            width:18px; height:18px; border-radius:50%;
            background: radial-gradient(circle, rgba(255,215,0,0.6), transparent 70%);
            pointer-events:none; z-index:999;
            --dx:${dx}px; --dy:${dy}px;
            animation: starburst-glow-trail ${dur + 0.1}s ease-out forwards;
        `;
        document.body.appendChild(trail);
        autoRemove(trail);

        // Star / sparkle
        const isSparkle = Math.random() > 0.6;
        const star = document.createElement('div');
        star.textContent = isSparkle ? '\u2728' : '\u2B50';
        star.style.cssText = `
            position:fixed; left:${x}px; top:${y}px;
            font-size:${rand(1, 1.8)}rem;
            pointer-events:none; z-index:1000;
            --dx:${dx}px; --dy:${dy}px;
            animation: starburst-fly ${dur}s ease-out forwards;
            animation-delay: ${rand(0, 0.08)}s;
        `;
        document.body.appendChild(star);
        autoRemove(star);
    }
}

/**
 * goldenGlow(element)
 * Adds a temporary golden radial-gradient glow behind an element.
 * Pulses once over ~0.8 s then removes itself.
 */
export function goldenGlow(element) {
    injectStyles();
    const { x, y } = elCenter(element);
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;

    const glow = document.createElement('div');
    glow.style.cssText = `
        position:fixed;
        left:${x}px; top:${y}px;
        width:${size}px; height:${size}px;
        border-radius:50%;
        background: radial-gradient(circle, rgba(255,215,0,0.55) 0%, rgba(255,215,0,0.15) 50%, transparent 70%);
        pointer-events:none;
        z-index:998;
        animation: golden-glow-pulse 0.8s ease-out forwards;
    `;
    document.body.appendChild(glow);
    autoRemove(glow);
}

/**
 * correctExplosion(element)
 * The BIG correct-answer celebration. Combines:
 *  1. golden glow behind the element
 *  2. star particles flying outward
 *  3. "CORRECT!" text zooming in and fading out
 */
export function correctExplosion(element) {
    injectStyles();
    const { x, y } = elCenter(element);

    // 1. Golden glow
    goldenGlow(element);

    // 2. Star burst (slightly larger than default)
    starBurst(x, y, 14);

    // 3. "CORRECT!" overlay text
    const text = document.createElement('div');
    text.className = 'correct-overlay';
    text.textContent = 'CORRECT!';
    text.style.left = x + 'px';
    text.style.top = y + 'px';
    document.body.appendChild(text);
    autoRemove(text);
}

/**
 * splashEffect(element)
 * Underwater splash for wrong answers.
 *  - Blue circle droplets fly out and fall
 *  - A few bubbles float upward
 *  - The element gets a brief ripple ring
 */
export function splashEffect(element) {
    injectStyles();
    const { x, y } = elCenter(element);
    const rect = element.getBoundingClientRect();
    const BLUE_SHADES = ['#4DD0E1', '#26C6DA', '#00ACC1', '#80DEEA', '#B2EBF2'];

    // Water droplets
    const dropCount = 10;
    for (let i = 0; i < dropCount; i++) {
        const angle = (i / dropCount) * Math.PI * 2 + rand(-0.3, 0.3);
        const dist = rand(30, 70);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist * 0.6; // slightly flatter spread
        const size = rand(5, 10);

        const drop = document.createElement('div');
        drop.style.cssText = `
            position:fixed; left:${x}px; top:${y}px;
            width:${size}px; height:${size}px;
            border-radius:50%;
            background:${pick(BLUE_SHADES)};
            pointer-events:none; z-index:1000;
            --dx:${dx}px; --dy:${dy}px;
            animation: splash-drop ${rand(0.5, 0.8)}s ease-out forwards;
            animation-delay:${rand(0, 0.1)}s;
        `;
        document.body.appendChild(drop);
        autoRemove(drop);
    }

    // Bubbles floating up
    for (let i = 0; i < 4; i++) {
        const bub = document.createElement('div');
        const size = rand(6, 12);
        bub.style.cssText = `
            position:fixed; left:${x + rand(-20, 20)}px; top:${y}px;
            width:${size}px; height:${size}px;
            border-radius:50%;
            background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(77,208,225,0.3));
            border: 1px solid rgba(255,255,255,0.4);
            pointer-events:none; z-index:1000;
            --drift:${rand(-15, 15)}px;
            animation: splash-bubble-up ${rand(0.6, 1.0)}s ease-out forwards;
            animation-delay:${rand(0.05, 0.2)}s;
        `;
        document.body.appendChild(bub);
        autoRemove(bub);
    }

    // Ripple ring on the element
    const ripple = document.createElement('div');
    const rippleSize = Math.max(rect.width, rect.height) * 1.2;
    ripple.style.cssText = `
        position:fixed;
        left:${x}px; top:${y}px;
        width:${rippleSize}px; height:${rippleSize}px;
        border-radius:50%;
        border:3px solid rgba(77,208,225,0.6);
        pointer-events:none; z-index:999;
        animation: ripple-ring 0.6s ease-out forwards;
    `;
    document.body.appendChild(ripple);
    autoRemove(ripple);
}

/**
 * streakFire(element)
 * Fire / spark particles floating upward from a streak counter badge.
 * Small orange-yellow particles flutter upward.
 */
export function streakFire(element) {
    injectStyles();
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const top = rect.top;
    const FIRE_COLORS = ['#FFD740', '#FFAB00', '#FF9100', '#FF6D00', '#FF8A80'];

    const count = 8;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const size = rand(4, 8);
        p.style.cssText = `
            position:fixed;
            left:${cx + rand(-rect.width / 2, rect.width / 2)}px;
            top:${top + rand(-4, 4)}px;
            width:${size}px; height:${size}px;
            border-radius:50%;
            background:${pick(FIRE_COLORS)};
            pointer-events:none; z-index:1000;
            --drift:${rand(-12, 12)}px;
            animation: fire-float ${rand(0.5, 0.9)}s ease-out forwards;
            animation-delay:${rand(0, 0.15)}s;
        `;
        document.body.appendChild(p);
        autoRemove(p);
    }
}

/**
 * ambientBubbles(container)
 * Spawns gentle translucent bubbles that float up inside `container`.
 * A new bubble appears every 2-3 seconds. Returns a cleanup function
 * that stops spawning and removes any remaining bubbles.
 */
export function ambientBubbles(container) {
    injectStyles();
    const bubbles = [];
    let stopped = false;

    function spawnBubble() {
        if (stopped) return;
        const size = rand(8, 22);
        const b = document.createElement('div');
        b.className = 'ambient-bubble';
        b.style.width = size + 'px';
        b.style.height = size + 'px';
        b.style.left = rand(5, 90) + '%';
        b.style.bottom = '0';
        b.style.setProperty('--drift', rand(-30, 30) + 'px');
        b.style.animationDuration = rand(6, 12) + 's';

        container.appendChild(b);
        bubbles.push(b);

        b.addEventListener('animationend', () => {
            b.remove();
            const idx = bubbles.indexOf(b);
            if (idx !== -1) bubbles.splice(idx, 1);
        });

        // Schedule next bubble
        const next = rand(2000, 3000);
        timeoutId = setTimeout(spawnBubble, next);
    }

    let timeoutId = setTimeout(spawnBubble, rand(500, 1500));

    return function cleanup() {
        stopped = true;
        clearTimeout(timeoutId);
        bubbles.forEach(b => b.remove());
        bubbles.length = 0;
    };
}

/**
 * ambientFish(container)
 * A handful of fish emoji that slowly drift across the container.
 * Fish swim left-to-right or right-to-left with gentle vertical wave.
 * Returns a cleanup function.
 */
export function ambientFish(container) {
    injectStyles();
    const FISH = ['\uD83D\uDC20', '\uD83D\uDC21', '\uD83D\uDC19', '\uD83E\uDD80'];
    const fishes = [];
    let stopped = false;

    function spawnFish() {
        if (stopped) return;

        const f = document.createElement('div');
        f.className = 'ambient-fish';
        f.textContent = pick(FISH);
        f.style.fontSize = rand(1.2, 2.2) + 'rem';
        f.style.top = rand(10, 80) + '%';

        const goRight = Math.random() > 0.5;
        f.style.setProperty('--wave', rand(-20, 20) + 'px');
        f.style.animationName = goRight ? 'fish-swim-right' : 'fish-swim-left';
        f.style.animationDuration = rand(12, 22) + 's';
        f.style.left = '0';
        f.style.width = '100%';

        container.appendChild(f);
        fishes.push(f);

        f.addEventListener('animationend', () => {
            f.remove();
            const idx = fishes.indexOf(f);
            if (idx !== -1) fishes.splice(idx, 1);
        });

        timeoutId = setTimeout(spawnFish, rand(6000, 14000));
    }

    let timeoutId = setTimeout(spawnFish, rand(1000, 3000));

    return function cleanup() {
        stopped = true;
        clearTimeout(timeoutId);
        fishes.forEach(f => f.remove());
        fishes.length = 0;
    };
}

/**
 * ambientButterflies(container)
 * Like ambientFish but slower, with butterfly/ladybug/beetle emoji.
 * For the Purrfect Park theme. Returns a cleanup function.
 */
export function ambientButterflies(container) {
    injectStyles();
    const CREATURES = ['\uD83E\uDD8B', '\uD83D\uDC1E', '\uD83E\uDDA4', '\uD83D\uDC1D']; // 🦋 🐞 🪤 🐝
    const flyers = [];
    let stopped = false;

    function spawnFlyer() {
        if (stopped) return;

        const f = document.createElement('div');
        f.className = 'ambient-fish';
        f.textContent = pick(CREATURES);
        f.style.fontSize = rand(1.1, 1.8) + 'rem';
        f.style.top = rand(8, 75) + '%';

        const goRight = Math.random() > 0.5;
        f.style.setProperty('--wave', rand(-30, 30) + 'px');
        f.style.animationName = goRight ? 'fish-swim-right' : 'fish-swim-left';
        f.style.animationDuration = rand(16, 28) + 's'; // slower than fish
        f.style.left = '0';
        f.style.width = '100%';

        container.appendChild(f);
        flyers.push(f);

        f.addEventListener('animationend', () => {
            f.remove();
            const idx = flyers.indexOf(f);
            if (idx !== -1) flyers.splice(idx, 1);
        });

        timeoutId = setTimeout(spawnFlyer, rand(4000, 9000));
    }

    let timeoutId = setTimeout(spawnFlyer, rand(500, 2000));

    return function cleanup() {
        stopped = true;
        clearTimeout(timeoutId);
        flyers.forEach(f => f.remove());
        flyers.length = 0;
    };
}

/**
 * ambientLeaves(container)
 * Gentle falling leaf / cherry-blossom emoji that drift down with rotation.
 * Returns a cleanup function.
 */
export function ambientLeaves(container) {
    injectStyles();
    const LEAVES = ['\uD83C\uDF43', '\uD83C\uDF42', '\uD83C\uDF38', '\uD83C\uDF3A']; // 🍃 🍂 🌸 🌺
    const leaves = [];
    let stopped = false;

    function spawnLeaf() {
        if (stopped) return;
        const leaf = document.createElement('div');
        leaf.className = 'ambient-leaf';
        leaf.textContent = pick(LEAVES);
        leaf.style.left = rand(0, 95) + '%';
        leaf.style.fontSize = rand(1.0, 1.6) + 'rem';
        leaf.style.setProperty('--drift', rand(-60, 60) + 'px');
        leaf.style.animationDuration = rand(7, 13) + 's';

        container.appendChild(leaf);
        leaves.push(leaf);

        leaf.addEventListener('animationend', () => {
            leaf.remove();
            const idx = leaves.indexOf(leaf);
            if (idx !== -1) leaves.splice(idx, 1);
        });

        timeoutId = setTimeout(spawnLeaf, rand(1200, 2400));
    }

    let timeoutId = setTimeout(spawnLeaf, rand(300, 1200));

    return function cleanup() {
        stopped = true;
        clearTimeout(timeoutId);
        leaves.forEach(l => l.remove());
        leaves.length = 0;
    };
}

/**
 * shimmerStars(element)
 * Continuous tiny sparkle particles around an element (e.g. completed
 * map nodes). Returns a cleanup function to stop the effect.
 */
export function shimmerStars(element) {
    injectStyles();
    const particles = [];
    let stopped = false;

    function spawn() {
        if (stopped) return;

        const rect = element.getBoundingClientRect();
        const margin = 10;

        const p = document.createElement('div');
        p.textContent = pick(['\u2728', '\u2B50', '\u2726']);
        const size = rand(0.55, 0.95);
        const sx = rand(-margin, rect.width + margin);
        const sy = rand(-margin, rect.height + margin);

        p.style.cssText = `
            position:fixed;
            left:${rect.left}px; top:${rect.top}px;
            font-size:${size}rem;
            pointer-events:none; z-index:999;
            --sx:${sx}px; --sy:${sy}px;
            animation: shimmer-twinkle ${rand(0.8, 1.6)}s ease-in-out forwards;
        `;

        document.body.appendChild(p);
        particles.push(p);

        p.addEventListener('animationend', () => {
            p.remove();
            const idx = particles.indexOf(p);
            if (idx !== -1) particles.splice(idx, 1);
        });

        timeoutId = setTimeout(spawn, rand(300, 700));
    }

    let timeoutId = setTimeout(spawn, rand(100, 400));

    return function cleanup() {
        stopped = true;
        clearTimeout(timeoutId);
        particles.forEach(p => p.remove());
        particles.length = 0;
    };
}
