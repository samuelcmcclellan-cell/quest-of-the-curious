import { getState, getNextAvailableChallenge, getIslandProgress, getAllIslandSlugs } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { confetti, starBurst } from '../engine/particles.js';

const ISLAND_META = {
    'numbers-reef':  { name: 'Numbers Reef',  mascot: '🦉', emoji: '🏝️' },
    'purrfect-park': { name: 'Purrfect Park', mascot: '🐱', emoji: '🌳' }
};

const REACTION_BY_STARS = {
    3: 'AMAZING! Perfect score! You\'re a math superstar!',
    2: 'Great work, explorer! So close to perfect!',
    1: 'Good job! You solved it! Keep practicing!',
    0: 'Keep trying! You\'ll get it!'
};

function parseParams(params) {
    // New: [islandSlug, index, stars]. Legacy: [index, stars].
    if (!params || params.length === 0) {
        return { islandSlug: getState().currentIsland || 'numbers-reef', index: 0, stars: 0 };
    }
    const first = params[0];
    const isIndexOnly = /^\d+$/.test(first);
    if (isIndexOnly) {
        return {
            islandSlug: getState().currentIsland || 'numbers-reef',
            index: parseInt(first, 10),
            stars: parseInt(params[1] || '0', 10)
        };
    }
    return {
        islandSlug: first,
        index: parseInt(params[1] || '0', 10),
        stars: parseInt(params[2] || '0', 10)
    };
}

export function enter(container, params) {
    const { islandSlug, stars } = parseParams(params);
    const state = getState();
    const meta = ISLAND_META[islandSlug] || ISLAND_META['numbers-reef'];

    const nextChallengeIdx = getNextAvailableChallenge(islandSlug);
    const islandComplete = nextChallengeIdx === -1;

    // Find a different island that still has challenges left (if any)
    const otherIslands = getAllIslandSlugs().filter(s => s !== islandSlug);
    const otherHasMore = otherIslands.find(s => getNextAvailableChallenge(s) !== -1);
    const otherMeta = otherHasMore ? ISLAND_META[otherHasMore] : null;

    const reactionMsg = REACTION_BY_STARS[stars] || REACTION_BY_STARS[0];
    const coinsEarned = stars * 5 + (stars === 3 ? 3 : 0);

    const starHTML = Array.from({ length: 3 }, (_, i) => {
        const filled = i < stars;
        return `<span class="result-star ${filled ? 'result-star-filled' : 'result-star-empty'}" style="animation-delay:${0.3 + i * 0.25}s;">
            ${filled ? '⭐' : '☆'}
        </span>`;
    }).join('');

    // All-islands complete?
    const totalSlugs = getAllIslandSlugs();
    const allDone = totalSlugs.every(s => getIslandProgress(s).isComplete);

    container.innerHTML = `
        <div class="results-container">
            <div class="guide-character guide-celebrate anim-float" style="font-size:4rem;">${meta.mascot}🎉</div>
            <div class="results-stars" id="stars-area">${starHTML}</div>
            <p class="results-message">${reactionMsg}</p>
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
                ${!islandComplete ? `<button class="btn btn-primary btn-large" id="next-btn">Next Challenge →</button>` : ''}
                ${islandComplete && otherMeta ? `<button class="btn btn-primary btn-large" id="next-island-btn">${otherMeta.emoji} Go to ${otherMeta.name} →</button>` : ''}
                <button class="btn btn-secondary" id="map-btn">🗺️ Back to Map</button>
                ${islandComplete ? `<p style="color:var(--success);font-weight:700;font-size:1.2rem;margin-top:12px;">🎉 You completed ${meta.name}!</p>` : ''}
                ${allDone ? `<p style="color:#7B1FA2;font-weight:800;font-size:1.1rem;margin-top:4px;">🏆 All islands complete — you're a true Quest Master!</p>` : ''}
            </div>
        </div>
    `;

    // Animated stars + burst
    const starsArea = container.querySelector('#stars-area');
    setTimeout(() => {
        sound.star();
        if (starsArea) {
            const rect = starsArea.getBoundingClientRect();
            starBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
        }
    }, 600);

    // Coin reward animation
    setTimeout(() => {
        const coinEl = container.querySelector('#coin-reward');
        if (coinEl) {
            coinEl.style.opacity = '1';
            coinEl.classList.add('anim-bounce');
            sound.coinCollect();
        }
    }, 1000);

    if (stars === 3) {
        setTimeout(() => confetti(50), 400);
        setTimeout(() => confetti(30), 1200);
    } else if (stars >= 1) {
        setTimeout(() => confetti(20), 500);
    }

    if (islandComplete) {
        setTimeout(() => {
            sound.achievement();
            confetti(70);
        }, 1500);
    }

    if (allDone) {
        setTimeout(() => {
            sound.achievement();
            confetti(100);
        }, 2200);
    }

    const nextBtn = container.querySelector('#next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            sound.tap();
            navigate(`challenge/${islandSlug}/${nextChallengeIdx}`);
        });
    }

    const nextIslandBtn = container.querySelector('#next-island-btn');
    if (nextIslandBtn) {
        nextIslandBtn.addEventListener('click', () => {
            sound.tap();
            navigate('map/' + otherHasMore);
        });
    }

    container.querySelector('#map-btn').addEventListener('click', () => {
        sound.tap();
        navigate('map/' + islandSlug);
    });
}

export function exit() {}
