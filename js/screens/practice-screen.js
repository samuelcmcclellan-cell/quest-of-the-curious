import { getState, updateState } from '../state.js';
import { navigate } from '../router.js';
import { generateChallenge } from '../utils/math-generator.js';
import { DifficultyTracker } from '../utils/difficulty.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { SequenceNext } from '../challenges/sequence-next.js';
import * as sound from '../engine/sound.js';
import { confetti, streakFire } from '../engine/particles.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'sequence-next': SequenceNext,
};

let currentChallenge = null;
let tracker = null;
let stats = { total: 0, correct: 0, streak: 0 };

export function enter(container) {
    const state = getState();
    tracker = new DifficultyTracker(state.practice.difficulty || 1);
    stats = { total: 0, correct: 0, streak: 0 };

    renderWrapper(container);
    loadNext(container);
}

function renderWrapper(container) {
    container.innerHTML = `
        <div class="challenge-screen challenge-bg-${tracker.getLevel()}">
            <div class="challenge-header">
                <button class="btn btn-small btn-ghost" id="back-btn">← Map</button>
                <div id="practice-info" style="text-align:center;">
                    <div style="font-weight:700;font-size:0.9rem;">Practice Mode 🎯</div>
                    <div style="font-size:0.75rem;color:var(--text-light);" id="practice-stats">Level ${tracker.getLevel()} · 0/0</div>
                </div>
                <div class="guide-character guide-idle anim-float" style="font-size:1.8rem;" id="guide">🦉</div>
            </div>
            <div class="challenge-body" id="practice-body"></div>
            <div class="challenge-footer">
                <div class="streak-badge" id="streak-badge" style="display:none;">
                    🔥 <span id="streak-count">0</span> streak!
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
        statsEl.textContent = `Level ${tracker.getLevel()} · ${stats.correct}/${stats.total} · ${tracker.getAccuracy()}%`;
    }

    // Update streak badge
    const badge = container.querySelector('#streak-badge');
    if (badge) {
        if (stats.streak >= 2) {
            badge.style.display = 'flex';
            container.querySelector('#streak-count').textContent = stats.streak;
            // Fire effect on streak badge
            if (stats.streak >= 3) {
                streakFire(badge);
            }
        } else {
            badge.style.display = 'none';
        }
    }

    // Update bg class for difficulty level
    const screen = container.querySelector('.challenge-screen');
    if (screen) {
        screen.className = `challenge-screen challenge-bg-${tracker.getLevel()}`;
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

    currentChallenge.onComplete = (score) => {
        stats.total++;
        stats.correct++;
        stats.streak++;
        tracker.record(true);

        // Award coins for practice
        const coins = score >= 3 ? 3 : score >= 2 ? 2 : 1;
        updateState(s => {
            s.coins = (s.coins || 0) + coins;
            s.stats.totalChallenges++;
            s.stats.totalCorrect++;
            s.stats.streakCurrent = stats.streak;
            s.stats.streakBest = Math.max(s.stats.streakBest, stats.streak);
        });

        updateStats(container);

        // Guide cheers
        const guide = container.querySelector('#guide');
        if (guide) {
            guide.textContent = '🦉🎉';
            setTimeout(() => { if (guide) guide.textContent = '🦉'; }, 1200);
        }

        if (score === 3) confetti(15);

        setTimeout(() => {
            loadNext(container);
        }, 1200);
    };

    // Override checkAnswer to track wrong answers
    const origCheck = currentChallenge.checkAnswer.bind(currentChallenge);
    currentChallenge.checkAnswer = (answer) => {
        const result = origCheck(answer);
        if (!result.correct) {
            tracker.record(false);
            stats.total++;
            stats.streak = 0;
            updateState(s => { s.stats.streakCurrent = 0; });
            updateStats(container);

            // Guide encourages
            const guide = container.querySelector('#guide');
            if (guide) {
                guide.textContent = '🦉💪';
                setTimeout(() => { if (guide) guide.textContent = '🦉'; }, 1200);
            }
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
}
