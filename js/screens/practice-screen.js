import { getState, updateState, getCurrentProfileMeta, getWrongAnswerCount, LOCKOUT_THRESHOLD, isToddlerTier, isJuniorTier } from '../state.js';
import { navigate } from '../router.js';
import { generateChallenge } from '../utils/math-generator.js';
import { DifficultyTracker } from '../utils/difficulty.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { SequenceNext } from '../challenges/sequence-next.js';
import * as sound from '../engine/sound.js';
import { confetti, streakFire } from '../engine/particles.js';
import { getCurrentTheme, pickCorrectPhrase, pickWrongPhrase } from '../engine/profile-theme.js';
import { STRINGS } from '../i18n.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'sequence-next': SequenceNext,
};

let currentChallenge = null;
let tracker = null;
let stats = { total: 0, correct: 0, streak: 0 };
let wrongListener = null;
let correctListener = null;
let speechTimer = null;

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

export function enter(container) {
    const state = getState();
    const profile = getCurrentProfileMeta();
    const maxLevel = isToddlerTier(profile) ? 1 : isJuniorTier(profile) ? 2 : 5;
    const startLevel = Math.min(state.practice.difficulty || 1, maxLevel);
    tracker = new DifficultyTracker(startLevel, maxLevel);
    stats = { total: 0, correct: 0, streak: 0 };

    renderWrapper(container);

    wrongListener = (e) => {
        const { wrongCount, locked } = e.detail || {};
        updateHeartStrip(container, wrongCount || 0);
        showSpeech(container, pickWrongPhrase(profile.id));
        if (locked) {
            sound.timeout && sound.timeout();
            setTimeout(() => navigate('lockout'), 600);
        }
    };
    correctListener = () => updateHeartStrip(container, getWrongAnswerCount());
    document.addEventListener('quest:wrong-answer', wrongListener);
    document.addEventListener('quest:correct-answer', correctListener);

    loadNext(container);
}

function renderWrapper(container) {
    const theme = getCurrentTheme();
    const initialWrong = getWrongAnswerCount();
    const profile = getCurrentProfileMeta();
    const tierClass = isToddlerTier(profile) ? 'tier-toddler'
        : isJuniorTier(profile) ? 'tier-junior' : 'tier-older';

    container.innerHTML = `
        <div class="challenge-screen challenge-bg-${tracker.getLevel()} ${theme.themeClass} ${tierClass}">
            <div class="challenge-header">
                <button class="btn btn-small btn-ghost" id="back-btn">← Mapa</button>
                <div class="challenge-header-center">
                    <div id="practice-info" style="text-align:center;">
                        <div style="font-weight:700;font-size:0.9rem;">Modo Prática 🎯</div>
                        <div style="font-size:0.75rem;color:var(--text-light);" id="practice-stats">Nível ${tracker.getLevel()} · 0/0</div>
                    </div>
                    <div class="heart-strip" id="heart-strip" title="${STRINGS.hearts.tooltip}">
                        ${renderHeartStrip(initialWrong)}
                    </div>
                </div>
                <div class="mascot-stack" id="mascot-stack">
                    <div class="mascot-speech" id="mascot-speech" style="opacity:0;"></div>
                    <div class="mascot-island anim-float">🦉</div>
                    <div class="mascot-profile">${theme.sidekick}</div>
                </div>
            </div>
            <div class="challenge-body" id="practice-body"></div>
            <div class="challenge-footer">
                <div class="streak-badge" id="streak-badge" style="display:none;">
                    🔥 sequência de <span id="streak-count">0</span>!
                </div>
            </div>
        </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => {
        updateState(s => { s.practice.difficulty = tracker.getLevel(); });
        navigate('map');
    });
}

function updateStats(container) {
    const statsEl = container.querySelector('#practice-stats');
    if (statsEl) {
        statsEl.textContent = `Nível ${tracker.getLevel()} · ${stats.correct}/${stats.total} · ${tracker.getAccuracy()}%`;
    }

    const badge = container.querySelector('#streak-badge');
    if (badge) {
        if (stats.streak >= 2) {
            badge.style.display = 'flex';
            container.querySelector('#streak-count').textContent = stats.streak;
            if (stats.streak >= 3) {
                streakFire(badge);
            }
        } else {
            badge.style.display = 'none';
        }
    }

    const screen = container.querySelector('.challenge-screen');
    if (screen) {
        const theme = getCurrentTheme();
        const profile = getCurrentProfileMeta();
        const tierClass = isToddlerTier(profile) ? 'tier-toddler'
            : isJuniorTier(profile) ? 'tier-junior' : 'tier-older';
        screen.className = `challenge-screen challenge-bg-${tracker.getLevel()} ${theme.themeClass} ${tierClass}`;
    }
}

function loadNext(container) {
    const bodyEl = container.querySelector('#practice-body');
    if (!bodyEl) return;

    const data = generateChallenge(tracker.getLevel());
    const ChallengeClass = CHALLENGE_TYPES[data.type];

    if (!ChallengeClass) {
        return loadNext(container);
    }

    if (currentChallenge) {
        currentChallenge.destroy();
    }

    bodyEl.innerHTML = '';
    currentChallenge = new ChallengeClass(data, bodyEl);

    const profile = getCurrentProfileMeta();

    currentChallenge.onComplete = (score) => {
        stats.total++;
        stats.correct++;
        stats.streak++;
        tracker.record(true);

        const coins = score >= 3 ? 3 : score >= 2 ? 2 : 1;
        updateState(s => {
            s.coins = (s.coins || 0) + coins;
            s.stats.totalChallenges++;
            s.stats.totalCorrect++;
            s.stats.streakCurrent = stats.streak;
            s.stats.streakBest = Math.max(s.stats.streakBest, stats.streak);
        });

        updateStats(container);
        showSpeech(container, pickCorrectPhrase(profile.id));

        if (score === 3) confetti(15);

        setTimeout(() => {
            loadNext(container);
        }, 1200);
    };

    // Override checkAnswer to track wrong answers — ChallengeBase already
    // dispatches the quest:wrong-answer event via recordWrong, so the
    // heart strip and lockout transition are handled by our listeners.
    const origCheck = currentChallenge.checkAnswer.bind(currentChallenge);
    currentChallenge.checkAnswer = (answer) => {
        const result = origCheck(answer);
        if (!result.correct) {
            tracker.record(false);
            stats.total++;
            stats.streak = 0;
            updateState(s => { s.stats.streakCurrent = 0; });
            updateStats(container);
        }
        return result;
    };

    currentChallenge.render();
}

export function exit() {
    if (currentChallenge) {
        currentChallenge.destroy();
        currentChallenge = null;
    }
    if (tracker) {
        updateState(s => { s.practice.difficulty = tracker.getLevel(); });
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
