import { getState, getNextAvailableChallenge } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { confetti } from '../engine/particles.js';

const OWL_REACTIONS = {
    3: { emoji: '🦉✨', message: 'Amazing! Perfect score!' },
    2: { emoji: '🦉😊', message: 'Great work, explorer!' },
    1: { emoji: '🦉👍', message: 'Good job! You solved it!' },
    0: { emoji: '🦉🤔', message: 'Keep trying!' },
};

export function enter(container, params) {
    const challengeIndex = parseInt(params[0]) || 0;
    const stars = parseInt(params[1]) || 0;
    const state = getState();
    const reaction = OWL_REACTIONS[stars] || OWL_REACTIONS[0];
    const nextChallenge = getNextAvailableChallenge();
    const allComplete = nextChallenge === -1;

    const starHTML = Array.from({ length: 3 }, (_, i) => {
        const filled = i < stars;
        const delay = `delay-${i + 1}`;
        return `<span class="anim-star-pop ${delay}" style="opacity:0;color:${filled ? '#FFD700' : '#D0D0D0'};">${filled ? '⭐' : '☆'}</span>`;
    }).join('');

    container.innerHTML = `
        <div class="results-container">
            <div class="anim-float" style="font-size:4rem;">${reaction.emoji}</div>
            <div class="results-stars">${starHTML}</div>
            <p class="results-message">${reaction.message}</p>
            <p style="color:var(--text-light);">
                ${state.playerName} now has ${state.totalStars} total stars!
            </p>
            <div class="results-buttons">
                ${!allComplete ? `<button class="btn btn-primary btn-large" id="next-btn">Next Challenge →</button>` : ''}
                <button class="btn btn-secondary" id="map-btn">🗺️ Back to Map</button>
                ${allComplete ? '<p style="color:var(--success);font-weight:700;font-size:1.2rem;margin-top:12px;">🎉 You completed Numbers Reef!</p>' : ''}
            </div>
        </div>
    `;

    // Play star sound and confetti
    setTimeout(() => {
        sound.star();
        if (stars === 3) confetti(40);
        else if (stars >= 1) confetti(15);
    }, 300);

    if (allComplete) {
        setTimeout(() => {
            sound.achievement();
            confetti(60);
        }, 800);
    }

    const nextBtn = container.querySelector('#next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            navigate('challenge/' + nextChallenge);
        });
    }

    container.querySelector('#map-btn').addEventListener('click', () => navigate('map'));
}

export function exit() {}
