import { getState, getNextAvailableChallenge } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { confetti, starBurst, correctExplosion } from '../engine/particles.js';

const GUIDE_REACTIONS = {
    3: { emoji: '🦉🎉', message: 'AMAZING! Perfect score! You\'re a math superstar!' },
    2: { emoji: '🦉😊', message: 'Great work, explorer! So close to perfect!' },
    1: { emoji: '🦉👍', message: 'Good job! You solved it! Keep practicing!' },
    0: { emoji: '🦉🤔', message: 'Keep trying! You\'ll get it!' },
};

export function enter(container, params) {
    const challengeIndex = parseInt(params[0]) || 0;
    const stars = parseInt(params[1]) || 0;
    const state = getState();
    const reaction = GUIDE_REACTIONS[stars] || GUIDE_REACTIONS[0];
    const nextChallenge = getNextAvailableChallenge();
    const allComplete = nextChallenge === -1;
    const coinsEarned = stars * 5 + (stars === 3 ? 3 : 0);

    const starHTML = Array.from({ length: 3 }, (_, i) => {
        const filled = i < stars;
        return `<span class="result-star ${filled ? 'result-star-filled' : 'result-star-empty'}" style="animation-delay:${0.3 + i * 0.25}s;">
            ${filled ? '⭐' : '☆'}
        </span>`;
    }).join('');

    container.innerHTML = `
        <div class="results-container">
            <div class="guide-character guide-celebrate anim-float" style="font-size:4rem;">${reaction.emoji}</div>
            <div class="results-stars" id="stars-area">${starHTML}</div>
            <p class="results-message">${reaction.message}</p>
            <div class="results-rewards">
                <div class="reward-badge reward-coins" id="coin-reward" style="opacity:0;">
                    💰 +${coinsEarned} coins!
                </div>
                ${state.stats.streakCurrent >= 3 ? `<div class="reward-badge reward-streak" style="animation-delay:0.8s;">🔥 ${state.stats.streakCurrent} streak!</div>` : ''}
            </div>
            <p style="color:var(--text-light);font-size:0.9rem;">
                ${state.playerName}: ⭐ ${state.totalStars} stars &nbsp; 💰 ${state.coins || 0} coins
            </p>
            <div class="results-buttons">
                ${!allComplete ? `<button class="btn btn-primary btn-large" id="next-btn">Next Challenge →</button>` : ''}
                <button class="btn btn-secondary" id="map-btn">🗺️ Back to Map</button>
                ${allComplete ? '<p style="color:var(--success);font-weight:700;font-size:1.2rem;margin-top:12px;">🎉 You completed Numbers Reef!</p>' : ''}
            </div>
        </div>
    `;

    // Animate stars appearing with starBurst
    const starsArea = container.querySelector('#stars-area');
    setTimeout(() => {
        sound.star();
        if (starsArea) {
            const rect = starsArea.getBoundingClientRect();
            starBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
        }
    }, 600);

    // Show coin reward with animation
    setTimeout(() => {
        const coinEl = container.querySelector('#coin-reward');
        if (coinEl) {
            coinEl.style.opacity = '1';
            coinEl.classList.add('anim-bounce');
            sound.coinCollect();
        }
    }, 1000);

    // Confetti based on performance
    if (stars === 3) {
        setTimeout(() => confetti(50), 400);
        setTimeout(() => confetti(30), 1200);
    } else if (stars >= 1) {
        setTimeout(() => confetti(20), 500);
    }

    if (allComplete) {
        setTimeout(() => {
            sound.achievement();
            confetti(70);
        }, 1500);
    }

    const nextBtn = container.querySelector('#next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            sound.tap();
            navigate('challenge/' + nextChallenge);
        });
    }

    container.querySelector('#map-btn').addEventListener('click', () => {
        sound.tap();
        navigate('map');
    });
}

export function exit() {}
