import { getState, updateState } from '../state.js';
import { navigate } from '../router.js';
import { generateChallenge } from '../utils/math-generator.js';
import { DifficultyTracker } from '../utils/difficulty.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { SequenceNext } from '../challenges/sequence-next.js';
import * as sound from '../engine/sound.js';
import { confetti } from '../engine/particles.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'sequence-next': SequenceNext,
};

let currentChallenge = null;
let tracker = null;
let stats = { total: 0, correct: 0 };

export function enter(container) {
    const state = getState();
    tracker = new DifficultyTracker(state.practice.difficulty || 1);
    stats = { total: 0, correct: 0 };

    renderWrapper(container);
    loadNext(container);
}

function renderWrapper(container) {
    container.innerHTML = `
        <div class="challenge-header">
            <button class="btn btn-small btn-ghost" id="back-btn">← Map</button>
            <div id="practice-info" style="text-align:center;">
                <div style="font-weight:700;font-size:0.9rem;">Practice Mode 🎯</div>
                <div style="font-size:0.75rem;color:var(--text-light);" id="practice-stats">Level ${tracker.getLevel()} · 0/0</div>
            </div>
            <div class="owl anim-float" style="font-size:1.8rem;">🦉</div>
        </div>
        <div class="challenge-body" id="practice-body"></div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => {
        updateState(s => { s.practice.difficulty = tracker.getLevel(); });
        navigate('map');
    });
}

function loadNext(container) {
    const bodyEl = container.querySelector('#practice-body');
    if (!bodyEl) return;

    const data = generateChallenge(tracker.getLevel());
    const ChallengeClass = CHALLENGE_TYPES[data.type];

    if (!ChallengeClass) {
        // Fallback to multiple-choice if type not found
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
        tracker.record(true);

        // Update stats display
        const statsEl = container.querySelector('#practice-stats');
        if (statsEl) {
            statsEl.textContent = `Level ${tracker.getLevel()} · ${stats.correct}/${stats.total} · ${tracker.getAccuracy()}%`;
        }

        if (score === 3) confetti(15);

        // Auto-load next after a short delay
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
            const statsEl = container.querySelector('#practice-stats');
            if (statsEl) {
                statsEl.textContent = `Level ${tracker.getLevel()} · ${stats.correct}/${stats.total} · ${tracker.getAccuracy()}%`;
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
