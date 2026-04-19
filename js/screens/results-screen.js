import { getState, getNextAvailableChallenge, getIslandProgress, getAllIslandSlugs, getCurrentProfileMeta } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { confetti, starBurst } from '../engine/particles.js';
import { getCurrentTheme } from '../engine/profile-theme.js';
import { STRINGS } from '../i18n.js';

const ISLAND_META = {
    'numbers-reef':  { name: 'Recife dos Números',  mascot: '🦉', emoji: '🏝️' },
    'purrfect-park': { name: 'Parque Purrfeito', mascot: '🐱', emoji: '🌳' },
    'bubble-magic':  { name: 'Magia das Bolhas',  mascot: '🧙‍♀️', emoji: '🫧' },
    'crystal-rock':  { name: 'Rock dos Cristais',  mascot: '🎸', emoji: '💎' }
};

const REACTION_BY_STARS = {
    3: 'INCRÍVEL! Nota máxima! Você é uma estrela da matemática!',
    2: 'Ótimo trabalho, explorador! Quase perfeito!',
    1: 'Bom trabalho! Você resolveu! Continue praticando!',
    0: 'Continue tentando! Você vai conseguir!'
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

    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();
    const reactionMsg = stars === 3
        ? (STRINGS.results3starByProfile[profile.id] || REACTION_BY_STARS[3])
        : (REACTION_BY_STARS[stars] || REACTION_BY_STARS[0]);
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
        <div class="results-container ${theme.themeClass}">
            <div class="results-mascot-stack">
                <div class="guide-character guide-celebrate anim-float" style="font-size:4rem;">${meta.mascot}🎉</div>
                <div class="results-sidekick anim-float" style="font-size:2.6rem;">${theme.sidekick}</div>
            </div>
            <div class="results-stars" id="stars-area">${starHTML}</div>
            <p class="results-message">${reactionMsg}</p>
            <div class="results-rewards">
                <div class="reward-badge reward-coins" id="coin-reward" style="opacity:0;">
                    💰 +${coinsEarned} moedas!
                </div>
                ${state.stats.streakCurrent >= 3 ? `<div class="reward-badge reward-streak" style="animation-delay:0.8s;">🔥 sequência de ${state.stats.streakCurrent}!</div>` : ''}
            </div>
            <p style="color:var(--text-light);font-size:0.9rem;">
                ${state.playerName}: ⭐ ${state.totalStars} estrelas &nbsp; 💰 ${state.coins || 0} moedas
            </p>
            <div class="results-buttons">
                ${!islandComplete ? `<button class="btn btn-primary btn-large" id="next-btn">Próximo Desafio →</button>` : ''}
                ${islandComplete && otherMeta ? `<button class="btn btn-primary btn-large" id="next-island-btn">${otherMeta.emoji} Ir para ${otherMeta.name} →</button>` : ''}
                <button class="btn btn-secondary" id="map-btn">🗺️ Voltar ao Mapa</button>
                ${islandComplete ? `<p style="color:var(--success);font-weight:700;font-size:1.2rem;margin-top:12px;">🎉 Você completou ${meta.name}!</p>` : ''}
                ${allDone ? `<p style="color:#7B1FA2;font-weight:800;font-size:1.1rem;margin-top:4px;">🏆 Todas as ilhas completas — você é um verdadeiro Mestre da Jornada!</p>` : ''}
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
