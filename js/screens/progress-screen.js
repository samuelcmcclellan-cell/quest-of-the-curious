import { getState, getNextAvailableChallenge, getIslandProgress, getCurrentProfileMeta, isToddlerTier, isJuniorTier } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import * as speech from '../engine/speech.js';
import { getCurrentTheme } from '../engine/profile-theme.js';
import { STRINGS } from '../i18n.js';

let autoAdvanceTimer = null;

const ISLAND_META = {
    'numbers-reef':  { name: 'Recife dos Números',  mascot: '🦉' },
    'purrfect-park': { name: 'Parque Purrfeito',    mascot: '🐱' },
    'bubble-magic':  { name: 'Magia das Bolhas',    mascot: '🧙‍♀️' },
    'crystal-rock':  { name: 'Rock dos Cristais',   mascot: '🎸' },
    'volcano-tots':  { name: 'Vulcão dos Pequenos', mascot: '🦖' },
    'jungle-tots':   { name: 'Selva dos Pequenos',  mascot: '🦕' }
};

const AUTO_ADVANCE_MS = 3000;
const AUTO_ADVANCE_MS_JUNIOR = 6000;

export function enter(container, params) {
    const state = getState();
    const islandSlug = (params && params[0]) || state.currentIsland || 'numbers-reef';
    const meta = ISLAND_META[islandSlug] || ISLAND_META['numbers-reef'];
    const theme = getCurrentTheme();

    const sessionCount = parseInt(sessionStorage.getItem('quest:correctStreakSession') || '0', 10) || 0;
    sessionStorage.setItem('quest:correctStreakSession', '0');

    const islandProg = getIslandProgress(islandSlug);
    const streak = state.stats?.streakCurrent || 0;
    const coins = state.coins || 0;

    const nextIdx = getNextAvailableChallenge(islandSlug);
    const advanceHash = nextIdx === -1 ? `map/${islandSlug}` : `challenge/${islandSlug}/${nextIdx}`;

    // Use the pre-rendered headline keyed by player name so the spoken
    // and visible strings match exactly. Fall back to a templated string
    // (which then exits via browser TTS) only if the player name isn't
    // one of the three known profiles.
    const headline = STRINGS.progressHeadlineByName[state.playerName]
        || `Boa, ${state.playerName}! Vamos continuar!`;

    const profile = getCurrentProfileMeta();
    const tierClass = isToddlerTier(profile) ? 'tier-toddler'
        : isJuniorTier(profile) ? 'tier-junior' : 'tier-older';

    container.innerHTML = `
        <div class="results-container ${theme.themeClass} ${tierClass}">
            <div class="results-mascot-stack">
                <div class="guide-character anim-float" style="font-size:4rem;">${meta.mascot}💪</div>
                <div class="results-sidekick anim-float" style="font-size:2.6rem;">${theme.sidekick}</div>
            </div>
            <p class="results-message">${headline} 💪</p>
            <div class="results-rewards">
                <div class="reward-badge reward-coins" style="opacity:1;">
                    ✅ ${sessionCount} acertos seguidos!
                </div>
                ${streak >= 2 ? `<div class="reward-badge reward-streak" style="opacity:1;">🔥 sequência de ${streak}!</div>` : ''}
                <div class="reward-badge reward-coins" style="opacity:1;">
                    ⭐ ${islandProg.stars} estrelas em ${meta.name}
                </div>
                <div class="reward-badge reward-coins" style="opacity:1;">
                    💰 ${coins} moedas
                </div>
            </div>
            <div class="results-buttons">
                <div class="auto-advance-note" id="auto-advance-note">
                    Próximo desafio em instantes…
                    <span class="auto-advance-bar">
                        <span class="auto-advance-bar-fill" id="auto-advance-bar-fill"></span>
                    </span>
                </div>
                <button class="btn btn-primary btn-large" id="continue-btn">Continuar ▶</button>
                <button class="btn btn-secondary" id="map-btn">🗺️ Voltar ao Mapa</button>
            </div>
        </div>
    `;

    sound.star && sound.star();

    if (speech.isSupported()) {
        speech.speakPhrase(headline, { toddlerMode: isToddlerTier(profile) });
    }

    const advanceMs = (isJuniorTier(profile) || isToddlerTier(profile))
        ? AUTO_ADVANCE_MS_JUNIOR
        : AUTO_ADVANCE_MS;

    const bar = container.querySelector('#auto-advance-bar-fill');
    if (bar) {
        requestAnimationFrame(() => {
            bar.style.transition = `width ${advanceMs}ms linear`;
            bar.style.width = '100%';
        });
    }

    const goNext = () => {
        if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
        navigate(advanceHash);
    };

    container.querySelector('#continue-btn').addEventListener('click', () => {
        sound.tap();
        goNext();
    });

    container.querySelector('#map-btn').addEventListener('click', () => {
        sound.tap();
        if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
        navigate('map/' + islandSlug);
    });

    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
        autoAdvanceTimer = null;
        navigate(advanceHash);
    }, advanceMs);
}

export function exit() {
    speech.cancel();
    if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
}
