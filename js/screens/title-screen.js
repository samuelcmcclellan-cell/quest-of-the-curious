import { getState, updateState } from '../state.js';
import { navigate } from '../router.js';

let cleanupFns = [];

export function enter(container) {
    const state = getState();

    container.innerHTML = `
        <div class="title-scene">
            <div class="title-bubbles" id="title-bubbles"></div>
            <div class="title-fish" id="title-fish"></div>
            <div class="title-content">
                <div class="title-character anim-float">
                    <div class="guide-character guide-idle"></div>
                </div>
                <h1 class="title-text">
                    <span class="wave-letter" style="--i:0">Q</span><span class="wave-letter" style="--i:1">u</span><span class="wave-letter" style="--i:2">e</span><span class="wave-letter" style="--i:3">s</span><span class="wave-letter" style="--i:4">t</span><span class="wave-letter" style="--i:5"> </span><span class="wave-letter" style="--i:6">o</span><span class="wave-letter" style="--i:7">f</span><span class="wave-letter" style="--i:8"> </span><span class="wave-letter" style="--i:9">t</span><span class="wave-letter" style="--i:10">h</span><span class="wave-letter" style="--i:11">e</span><br>
                    <span class="wave-letter" style="--i:12">C</span><span class="wave-letter" style="--i:13">u</span><span class="wave-letter" style="--i:14">r</span><span class="wave-letter" style="--i:15">i</span><span class="wave-letter" style="--i:16">o</span><span class="wave-letter" style="--i:17">u</span><span class="wave-letter" style="--i:18">s</span>
                </h1>
                <p class="title-subtitle">Explore magical islands and solve math puzzles!</p>
                <div class="title-input-area">
                    <label class="title-label">Your explorer name:</label>
                    <input class="input" id="name-input" type="text" value="${state.playerName}" maxlength="20" placeholder="Enter your name">
                </div>
                <button class="btn btn-primary btn-large" id="start-btn">
                    Start Adventure 🚀
                </button>
                ${state.totalStars > 0 ? `<button class="btn btn-ghost title-continue" id="continue-btn">Continue Journey ⭐ ${state.totalStars} · 💰 ${state.coins || 0}</button>` : ''}
            </div>
        </div>
    `;

    // Ambient bubbles
    const bubblesEl = container.querySelector('#title-bubbles');
    const bubbleInterval = setInterval(() => {
        if (!document.body.contains(bubblesEl)) return;
        const b = document.createElement('div');
        b.className = 'ambient-bubble';
        b.style.left = Math.random() * 100 + '%';
        b.style.animationDuration = (3 + Math.random() * 4) + 's';
        b.style.width = b.style.height = (8 + Math.random() * 16) + 'px';
        bubblesEl.appendChild(b);
        b.addEventListener('animationend', () => b.remove());
    }, 800);
    cleanupFns.push(() => clearInterval(bubbleInterval));

    // Ambient fish
    const fishEl = container.querySelector('#title-fish');
    const fishEmojis = ['🐠', '🐟', '🐡', '🦈'];
    const fishInterval = setInterval(() => {
        if (!document.body.contains(fishEl)) return;
        const f = document.createElement('div');
        f.className = 'ambient-fish';
        f.textContent = fishEmojis[Math.floor(Math.random() * fishEmojis.length)];
        f.style.top = (10 + Math.random() * 70) + '%';
        const goRight = Math.random() > 0.5;
        f.style.left = goRight ? '-10%' : '110%';
        f.style.transform = goRight ? 'scaleX(1)' : 'scaleX(-1)';
        f.style.animationDuration = (6 + Math.random() * 6) + 's';
        f.dataset.direction = goRight ? 'right' : 'left';
        fishEl.appendChild(f);
        f.addEventListener('animationend', () => f.remove());
    }, 2500);
    cleanupFns.push(() => clearInterval(fishInterval));

    // Buttons
    const startAction = () => {
        const name = container.querySelector('#name-input').value.trim() || 'Explorer';
        updateState(s => { s.playerName = name; });
        navigate('islands');
    };

    container.querySelector('#start-btn').addEventListener('click', startAction);
    const continueBtn = container.querySelector('#continue-btn');
    if (continueBtn) continueBtn.addEventListener('click', startAction);
}

export function exit() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
}
