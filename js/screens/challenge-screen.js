import { getState, updateState } from '../state.js';
import { navigate } from '../router.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { BalanceScale } from '../challenges/balance-scale.js';
import { SequenceNext } from '../challenges/sequence-next.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'balance-scale': BalanceScale,
    'sequence-next': SequenceNext,
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

    // Build challenge screen structure
    container.innerHTML = `
        <div class="challenge-header">
            <button class="btn btn-small btn-ghost" id="back-btn">← Map</button>
            <div class="challenge-progress" id="progress-dots"></div>
            <div class="owl anim-float" style="font-size:1.8rem;">🦉</div>
        </div>
        <div class="challenge-body" id="challenge-body"></div>
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
        // Update state
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
        });

        navigate(`results/${challengeIndex}/${stars}`);
    };

    currentChallenge.render();

    // Back button
    container.querySelector('#back-btn').addEventListener('click', () => navigate('map'));
}

export function exit() {
    if (currentChallenge) {
        currentChallenge.destroy();
        currentChallenge = null;
    }
}
