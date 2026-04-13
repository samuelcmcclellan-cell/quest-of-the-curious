import { getState, updateState } from '../state.js';
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

const GUIDE_STATES = {
    idle:    { emoji: '🦉', message: '' },
    think:   { emoji: '🦉💭', message: 'Hmm, think carefully...' },
    cheer:   { emoji: '🦉🎉', message: '' },
    hint:    { emoji: '🦉💡', message: '' },
    encourage: { emoji: '🦉💪', message: "You've got this!" },
};

let currentChallenge = null;
let challengeData = null;

async function loadChallengeData() {
    if (challengeData) return challengeData;
    const response = await fetch('./data/numbers-reef.json');
    challengeData = await response.json();
    return challengeData;
}

export async function enter(container, params) {
    const challengeIndex = parseInt(params[0]) || 0;
    const state = getState();
    const data = await loadChallengeData();
    const challenge = data.challenges[challengeIndex];

    if (!challenge) {
        navigate('map');
        return;
    }

    const difficulty = challenge.difficulty || 1;
    const bgClass = `challenge-bg-${Math.min(difficulty, 5)}`;

    container.innerHTML = `
        <div class="challenge-screen ${bgClass}">
            <div class="challenge-header">
                <button class="btn btn-small btn-ghost" id="back-btn">← Map</button>
                <div class="challenge-progress" id="progress-dots"></div>
                <div class="guide-character guide-idle anim-float" id="guide" style="font-size:1.8rem;cursor:pointer;" title="Click for encouragement">🦉</div>
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
        if (state.challenges[i].completed) {
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

    // Guide character tap - gives encouragement
    const guideEl = container.querySelector('#guide');
    guideEl.addEventListener('click', () => {
        guideEl.textContent = GUIDE_STATES.encourage.emoji;
        guideEl.classList.add('anim-bounce');
        sound.tap();
        setTimeout(() => {
            guideEl.textContent = GUIDE_STATES.idle.emoji;
            guideEl.classList.remove('anim-bounce');
        }, 1200);
    });

    // Create the challenge instance
    const ChallengeClass = CHALLENGE_TYPES[challenge.type];
    if (!ChallengeClass) {
        container.querySelector('#challenge-body').innerHTML = `
            <div class="challenge-area" style="text-align:center;">
                <p>Unknown challenge type: ${challenge.type}</p>
                <button class="btn btn-primary" id="skip-btn">Skip</button>
            </div>
        `;
        container.querySelector('#skip-btn').addEventListener('click', () => navigate('map'));
        return;
    }

    const bodyEl = container.querySelector('#challenge-body');
    currentChallenge = new ChallengeClass(challenge, bodyEl);

    currentChallenge.onComplete = (stars) => {
        // Animate guide cheering
        guideEl.textContent = GUIDE_STATES.cheer.emoji;
        guideEl.classList.add('anim-bounce');

        // Award coins: 5 per star + 3 bonus for 3-star
        const coinReward = stars * 5 + (stars === 3 ? 3 : 0);

        updateState(s => {
            const c = s.challenges[challengeIndex];
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

        navigate(`results/${challengeIndex}/${stars}`);
    };

    currentChallenge.render();

    // Play whoosh on entry
    sound.whoosh();

    // Back button
    container.querySelector('#back-btn').addEventListener('click', () => navigate('map'));
}

export function exit() {
    if (currentChallenge) {
        currentChallenge.destroy();
        currentChallenge = null;
    }
}
