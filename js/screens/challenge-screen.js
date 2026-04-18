import { getState, updateState, getCurrentProfileMeta } from '../state.js';
import { navigate } from '../router.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { BalanceScale } from '../challenges/balance-scale.js';
import { SequenceNext } from '../challenges/sequence-next.js';
import * as sound from '../engine/sound.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'balance-scale': BalanceScale,
    'sequence-next': SequenceNext,
};

const ISLAND_MASCOTS = {
    'numbers-reef': '🦉',
    'purrfect-park': '🐱'
};

const GUIDE_STATES = {
    idle:      { suffix: '' },
    cheer:     { suffix: '🎉' },
    encourage: { suffix: '💪' },
    hint:      { suffix: '💡' },
};

let currentChallenge = null;
const dataCache = new Map();

async function loadChallengeData(islandSlug) {
    const age = getCurrentProfileMeta().age || 8;
    const variant = age <= 6 ? '-junior' : '';
    const key = islandSlug + variant;
    if (dataCache.has(key)) return dataCache.get(key);
    const response = await fetch(`./data/${islandSlug}${variant}.json`);
    const data = await response.json();
    dataCache.set(key, data);
    return data;
}

function parseParams(params) {
    // Supported shapes:
    //   ['numbers-reef', '3'] (new)
    //   ['3']                  (legacy) -> use state.currentIsland
    if (!params || params.length === 0) {
        return { islandSlug: getState().currentIsland || 'numbers-reef', index: 0 };
    }
    const first = params[0];
    const isIndexOnly = /^\d+$/.test(first);
    if (isIndexOnly) {
        return { islandSlug: getState().currentIsland || 'numbers-reef', index: parseInt(first, 10) };
    }
    return { islandSlug: first, index: parseInt(params[1] || '0', 10) };
}

export async function enter(container, params) {
    const { islandSlug, index: challengeIndex } = parseParams(params);
    const state = getState();

    let data;
    try {
        data = await loadChallengeData(islandSlug);
    } catch (e) {
        console.warn('Failed to load island data:', islandSlug, e);
        navigate('islands');
        return;
    }

    const challenge = data.challenges[challengeIndex];
    if (!challenge) {
        navigate('map/' + islandSlug);
        return;
    }

    const mascot = ISLAND_MASCOTS[islandSlug] || '🦉';
    const islandChallenges = state.islands[islandSlug]?.challenges || [];
    const difficulty = challenge.difficulty || 1;
    const bgClass = `challenge-bg-${Math.min(difficulty, 5)}`;

    container.innerHTML = `
        <div class="challenge-screen ${bgClass}">
            <div class="challenge-header">
                <button class="btn btn-small btn-ghost" id="back-btn">← Map</button>
                <div class="challenge-progress" id="progress-dots"></div>
                <div class="guide-character guide-idle anim-float" id="guide" style="font-size:1.8rem;cursor:pointer;" title="Click for encouragement">${mascot}</div>
            </div>
            <div class="challenge-body" id="challenge-body"></div>
            <div class="challenge-footer">
                <div class="streak-badge" id="streak-badge" style="display:none;">
                    🔥 <span id="streak-count">0</span> streak!
                </div>
            </div>
        </div>
    `;

    // Render progress dots
    const dotsEl = container.querySelector('#progress-dots');
    data.challenges.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'challenge-dot';
        if (islandChallenges[i]?.completed) {
            dot.classList.add('challenge-dot-done');
        } else if (i === challengeIndex) {
            dot.classList.add('challenge-dot-current');
        }
        dotsEl.appendChild(dot);
    });

    // Show streak if active
    const streak = state.stats.streakCurrent || 0;
    if (streak >= 2) {
        const badge = container.querySelector('#streak-badge');
        badge.style.display = 'flex';
        container.querySelector('#streak-count').textContent = streak;
    }

    // Guide tap - encouragement
    const guideEl = container.querySelector('#guide');
    guideEl.addEventListener('click', () => {
        guideEl.textContent = mascot + GUIDE_STATES.encourage.suffix;
        guideEl.classList.add('anim-bounce');
        sound.tap();
        setTimeout(() => {
            guideEl.textContent = mascot;
            guideEl.classList.remove('anim-bounce');
        }, 1200);
    });

    // Create challenge instance
    const ChallengeClass = CHALLENGE_TYPES[challenge.type];
    if (!ChallengeClass) {
        container.querySelector('#challenge-body').innerHTML = `
            <div class="challenge-area" style="text-align:center;">
                <p>Unknown challenge type: ${challenge.type}</p>
                <button class="btn btn-primary" id="skip-btn">Skip</button>
            </div>
        `;
        container.querySelector('#skip-btn').addEventListener('click', () => navigate('map/' + islandSlug));
        return;
    }

    const bodyEl = container.querySelector('#challenge-body');
    currentChallenge = new ChallengeClass(challenge, bodyEl);

    currentChallenge.onComplete = (stars) => {
        guideEl.textContent = mascot + GUIDE_STATES.cheer.suffix;
        guideEl.classList.add('anim-bounce');

        const coinReward = stars * 5 + (stars === 3 ? 3 : 0);

        updateState(s => {
            const c = s.islands[islandSlug].challenges[challengeIndex];
            c.completed = true;
            c.stars = Math.max(c.stars, stars);
            c.attempts += currentChallenge.attempts;
            c.hintsUsed += currentChallenge.hintsUsed;
            s.stats.totalChallenges++;
            s.stats.totalCorrect++;
            s.stats.streakCurrent++;
            s.stats.streakBest = Math.max(s.stats.streakBest, s.stats.streakCurrent);
            s.coins = (s.coins || 0) + coinReward;
        });

        navigate(`results/${islandSlug}/${challengeIndex}/${stars}`);
    };

    currentChallenge.render();
    sound.whoosh();

    container.querySelector('#back-btn').addEventListener('click', () => navigate('map/' + islandSlug));
}

export function exit() {
    if (currentChallenge) {
        currentChallenge.destroy();
        currentChallenge = null;
    }
}
