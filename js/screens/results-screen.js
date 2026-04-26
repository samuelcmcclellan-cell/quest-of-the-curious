import { getState, getNextAvailableChallenge, getIslandProgress, getAllIslandSlugs, getCurrentProfileMeta, isToddlerTier, isJuniorTier } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import * as speech from '../engine/speech.js';
import { confetti, starBurst, fireworks } from '../engine/particles.js';
import { getCurrentTheme } from '../engine/profile-theme.js';
import { getAchievementById } from '../engine/achievements.js';
import { STRINGS } from '../i18n.js';

let autoAdvanceTimer = null;

const ISLAND_META = {
    'numbers-reef':  { name: 'Recife dos Números',  mascot: '🦉', emoji: '🏝️' },
    'purrfect-park': { name: 'Parque Purrfeito', mascot: '🐱', emoji: '🌳' },
    'bubble-magic':  { name: 'Magia das Bolhas',  mascot: '🧙‍♀️', emoji: '🫧' },
    'crystal-rock':  { name: 'Rock dos Cristais',  mascot: '🎸', emoji: '💎' },
    'volcano-tots':  { name: 'Vulcão dos Pequenos', mascot: '🦖', emoji: '🌋' },
    'jungle-tots':   { name: 'Selva dos Pequenos',  mascot: '🦕', emoji: '🌴' }
};

// Reaction text by star count lives in STRINGS.resultsByStars so the audio
// generator and the runtime read from one source of truth.
const REACTION_BY_STARS = STRINGS.resultsByStars;

function parseParams(params) {
    // Shapes:
    //  [islandSlug, index, stars, flags?]
    //  [index, stars] (legacy)
    if (!params || params.length === 0) {
        return { islandSlug: getState().currentIsland || 'numbers-reef', index: 0, stars: 0, flags: new Set() };
    }
    const first = params[0];
    const isIndexOnly = /^\d+$/.test(first);
    if (isIndexOnly) {
        return {
            islandSlug: getState().currentIsland || 'numbers-reef',
            index: parseInt(first, 10),
            stars: parseInt(params[1] || '0', 10),
            flags: new Set()
        };
    }
    const flagStr = params[3] || '';
    const flags = new Set(flagStr.split(',').filter(Boolean));
    return {
        islandSlug: first,
        index: parseInt(params[1] || '0', 10),
        stars: parseInt(params[2] || '0', 10),
        flags
    };
}

export function enter(container, params) {
    const { islandSlug, stars, flags } = parseParams(params);
    const gotSpeed = flags.has('speed');
    const wasDaily = flags.has('daily');
    const state = getState();
    const meta = ISLAND_META[islandSlug] || ISLAND_META['numbers-reef'];

    // Pull & clear newly-unlocked achievements (set by challenge-screen)
    let justUnlocked = [];
    try {
        const raw = sessionStorage.getItem('quest:just-unlocked');
        if (raw) {
            justUnlocked = JSON.parse(raw).map(id => getAchievementById(id)).filter(Boolean);
            sessionStorage.removeItem('quest:just-unlocked');
        }
    } catch (e) { /* ignore */ }

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
    let coinsEarned = stars * 5 + (stars === 3 ? 3 : 0);
    if (gotSpeed) coinsEarned += 3;
    if (wasDaily) coinsEarned *= 2;

    const starHTML = Array.from({ length: 3 }, (_, i) => {
        const filled = i < stars;
        return `<span class="result-star ${filled ? 'result-star-filled' : 'result-star-empty'}" style="animation-delay:${0.3 + i * 0.25}s;">
            ${filled ? '⭐' : '☆'}
        </span>`;
    }).join('');

    // All-islands complete?
    const totalSlugs = getAllIslandSlugs();
    const allDone = totalSlugs.every(s => getIslandProgress(s).isComplete);

    const tierClass = isToddlerTier(profile) ? 'tier-toddler'
        : isJuniorTier(profile) ? 'tier-junior' : 'tier-older';

    container.innerHTML = `
        <div class="results-container ${theme.themeClass} ${tierClass}">
            <div class="results-mascot-stack">
                <div class="guide-character guide-celebrate anim-float" style="font-size:4rem;">${meta.mascot}🎉</div>
                <div class="results-sidekick anim-float" style="font-size:2.6rem;">${theme.sidekick}</div>
            </div>
            <div class="results-stars" id="stars-area">${starHTML}${gotSpeed ? '<span class="result-star result-star-speed" style="animation-delay:1.05s;">⚡</span>' : ''}</div>
            ${gotSpeed ? '<p class="results-speed-note">⚡ Estrela-relâmpago! Você resolveu super rápido!</p>' : ''}
            ${wasDaily ? '<p class="results-daily-note">🌟 Desafio do Dia — moedas em dobro!</p>' : ''}
            <p class="results-message">${reactionMsg}</p>
            <div class="results-rewards">
                <div class="reward-badge reward-coins" id="coin-reward" style="opacity:0;">
                    💰 +${coinsEarned} moedas!
                </div>
                ${state.stats.streakCurrent >= 3 ? `<div class="reward-badge reward-streak" style="animation-delay:0.8s;">🔥 sequência de ${state.stats.streakCurrent}!</div>` : ''}
            </div>
            ${justUnlocked.length ? `<div class="achievement-unlocks">${justUnlocked.map(a => `<div class="achievement-toast">${a.icon} <strong>${a.name}</strong> desbloqueado!<br><span class="achievement-desc">${a.desc}</span></div>`).join('')}</div>` : ''}
            <p style="color:var(--text-light);font-size:0.9rem;">
                ${state.playerName}: ⭐ ${state.totalStars} estrelas &nbsp; 💰 ${state.coins || 0} moedas
            </p>
            <div class="results-buttons">
                ${!islandComplete ? `<div class="auto-advance-note" id="auto-advance-note">Próximo desafio em instantes… <span class="auto-advance-bar"><span class="auto-advance-bar-fill" id="auto-advance-bar-fill"></span></span></div>` : ''}
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

    if (speech.isSupported() && reactionMsg) {
        speech.speakPhrase(reactionMsg, { toddlerMode: isToddlerTier(profile) });
    }

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
        setTimeout(() => confetti(60), 400);
        setTimeout(() => confetti(40), 1200);
        setTimeout(() => {
            const rect = starsArea?.getBoundingClientRect();
            if (rect) fireworks(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }, 700);
    } else if (stars >= 1) {
        setTimeout(() => confetti(28), 500);
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

    const nextIslandBtn = container.querySelector('#next-island-btn');
    if (nextIslandBtn) {
        nextIslandBtn.addEventListener('click', () => {
            sound.tap();
            navigate('map/' + otherHasMore);
        });
    }

    container.querySelector('#map-btn').addEventListener('click', () => {
        sound.tap();
        if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
        navigate('map/' + islandSlug);
    });

    // Auto-advance to the next challenge (no manual button needed).
    if (!islandComplete) {
        const isJuniorish = isJuniorTier(profile) || isToddlerTier(profile);
        const baseDelay = stars === 3 ? 2400 : 1800;
        const delay = isJuniorish ? baseDelay + 2200 : baseDelay;
        const bar = container.querySelector('#auto-advance-bar-fill');
        if (bar) {
            requestAnimationFrame(() => {
                bar.style.transition = `width ${delay}ms linear`;
                bar.style.width = '100%';
            });
        }
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = setTimeout(() => {
            autoAdvanceTimer = null;
            navigate(`challenge/${islandSlug}/${nextChallengeIdx}`);
        }, delay);
    }
}

export function exit() {
    speech.cancel();
    if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
}
