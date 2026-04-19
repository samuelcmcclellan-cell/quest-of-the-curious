import { getState, updateState, getCurrentProfileMeta, getWrongAnswerCount, LOCKOUT_THRESHOLD } from '../state.js';
import { navigate } from '../router.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { BalanceScale } from '../challenges/balance-scale.js';
import { SequenceNext } from '../challenges/sequence-next.js';
import * as sound from '../engine/sound.js';
import { getCurrentTheme, pickCorrectPhrase, pickWrongPhrase } from '../engine/profile-theme.js';
import { STRINGS } from '../i18n.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'balance-scale': BalanceScale,
    'sequence-next': SequenceNext,
};

const ISLAND_MASCOTS = {
    'numbers-reef': '🦉',
    'purrfect-park': '🐱',
    'bubble-magic': '🧙‍♀️',
    'crystal-rock': '🎸'
};

let currentChallenge = null;
let wrongListener = null;
let correctListener = null;
let speechTimer = null;
const dataCache = new Map();

async function loadChallengeData(islandSlug) {
    const age = getCurrentProfileMeta().age || 8;
    const variant = age <= 4 ? '-toddler' : age <= 6 ? '-junior' : '';
    const key = islandSlug + variant;
    if (dataCache.has(key)) return dataCache.get(key);
    const response = await fetch(`./data/${islandSlug}${variant}.json`);
    const data = await response.json();
    dataCache.set(key, data);
    return data;
}

function parseParams(params) {
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

function renderHeartStrip(count) {
    const pips = [];
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
        const filled = i < count;
        pips.push(`<span class="heart-pip ${filled ? 'heart-pip-filled' : ''}" aria-hidden="true">♥</span>`);
    }
    return pips.join('');
}

function updateHeartStrip(container, count) {
    const strip = container.querySelector('#heart-strip');
    if (!strip) return;
    strip.innerHTML = renderHeartStrip(count);
    if (count > 0) strip.classList.add('anim-shake');
    setTimeout(() => strip?.classList.remove('anim-shake'), 400);
}

function showSpeech(container, text) {
    const bubble = container.querySelector('#mascot-speech');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove('anim-fade-in');
    void bubble.offsetWidth;
    bubble.classList.add('anim-fade-in');
    bubble.style.opacity = '1';
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = setTimeout(() => {
        bubble.style.opacity = '0';
    }, 2500);
}

export async function enter(container, params) {
    const { islandSlug, index: challengeIndex } = parseParams(params);
    const state = getState();
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();

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

    const islandMascot = ISLAND_MASCOTS[islandSlug] || '🦉';
    const islandChallenges = state.islands[islandSlug]?.challenges || [];
    const difficulty = challenge.difficulty || 1;
    const bgClass = `challenge-bg-${Math.min(difficulty, 5)}`;
    const initialWrong = getWrongAnswerCount();

    container.innerHTML = `
        <div class="challenge-screen ${bgClass} ${theme.themeClass}">
            <div class="challenge-header">
                <button class="btn btn-small btn-ghost" id="back-btn">← Mapa</button>
                <div class="challenge-header-center">
                    <div class="challenge-progress" id="progress-dots"></div>
                    <div class="heart-strip" id="heart-strip" title="${STRINGS.hearts.tooltip}">
                        ${renderHeartStrip(initialWrong)}
                    </div>
                </div>
                <div class="mascot-stack" id="mascot-stack" title="Clique para motivação">
                    <div class="mascot-speech" id="mascot-speech" style="opacity:0;"></div>
                    <div class="mascot-island anim-float">${islandMascot}</div>
                    <div class="mascot-profile">${theme.sidekick}</div>
                </div>
            </div>
            <div class="challenge-body" id="challenge-body"></div>
            <div class="challenge-footer">
                <div class="streak-badge" id="streak-badge" style="display:none;">
                    🔥 sequência de <span id="streak-count">0</span>!
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

    // Mascot tap - encouragement (themed phrase)
    const mascotStack = container.querySelector('#mascot-stack');
    mascotStack.addEventListener('click', () => {
        mascotStack.classList.add('anim-bounce');
        sound.tap();
        showSpeech(container, pickCorrectPhrase(profile.id));
        setTimeout(() => mascotStack.classList.remove('anim-bounce'), 800);
    });

    // Create challenge instance
    const ChallengeClass = CHALLENGE_TYPES[challenge.type];
    if (!ChallengeClass) {
        container.querySelector('#challenge-body').innerHTML = `
            <div class="challenge-area" style="text-align:center;">
                <p>Tipo de desafio desconhecido: ${challenge.type}</p>
                <button class="btn btn-primary" id="skip-btn">Pular</button>
            </div>
        `;
        container.querySelector('#skip-btn').addEventListener('click', () => navigate('map/' + islandSlug));
        return;
    }

    const bodyEl = container.querySelector('#challenge-body');
    currentChallenge = new ChallengeClass(challenge, bodyEl);

    currentChallenge.onComplete = (stars) => {
        mascotStack.classList.add('anim-bounce');
        showSpeech(container, pickCorrectPhrase(profile.id));

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

    // Listen for wrong/correct from ChallengeBase — updates heart strip + lockout transition
    wrongListener = (e) => {
        const { wrongCount, locked } = e.detail || {};
        updateHeartStrip(container, wrongCount || 0);
        showSpeech(container, pickWrongPhrase(profile.id));
        if (locked) {
            sound.timeout && sound.timeout();
            setTimeout(() => navigate('lockout'), 600);
        }
    };
    correctListener = () => {
        updateHeartStrip(container, 0);
    };
    document.addEventListener('quest:wrong-answer', wrongListener);
    document.addEventListener('quest:correct-answer', correctListener);

    currentChallenge.render();
    sound.whoosh();

    container.querySelector('#back-btn').addEventListener('click', () => navigate('map/' + islandSlug));
}

export function exit() {
    if (currentChallenge) {
        currentChallenge.destroy();
        currentChallenge = null;
    }
    if (wrongListener) {
        document.removeEventListener('quest:wrong-answer', wrongListener);
        wrongListener = null;
    }
    if (correctListener) {
        document.removeEventListener('quest:correct-answer', correctListener);
        correctListener = null;
    }
    if (speechTimer) {
        clearTimeout(speechTimer);
        speechTimer = null;
    }
}
