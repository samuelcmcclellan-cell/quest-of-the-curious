import { getCurrentProfileMeta } from '../state.js';
import { STRINGS, pickRandom } from '../i18n.js';

export const PROFILE_THEMES = {
    ziva: {
        name: 'Ziva',
        displayAvatar: '🔮',
        sidekick: '🧚',
        accentEmoji: '✨',
        decorations: ['🔮', '✨', '🌙', '⭐', '💫', '🪄'],
        ambient: 'sparkles',
        cursorTrail: 'sparkles',
        lockoutBg: 'theme-bg-crystal',
        bgPattern: 'stars-and-moons',
        themeClass: 'theme-ziva'
    },
    ava: {
        name: 'Ava',
        displayAvatar: '🐺',
        sidekick: '🌙',
        accentEmoji: '🐾',
        decorations: ['🐺', '🌙', '🐾', '🌲', '⭐', '🌌'],
        ambient: 'wolfPaws',
        cursorTrail: 'pawPrints',
        lockoutBg: 'theme-bg-forest',
        bgPattern: 'forest-night',
        themeClass: 'theme-ava'
    },
    ella: {
        name: 'Ella',
        displayAvatar: '🦕',
        sidekick: '🦖',
        accentEmoji: '🦴',
        decorations: ['🦕', '🦖', '🌋', '🥚', '🌴', '🦴', '🌿'],
        ambient: 'dinoFootprints',
        cursorTrail: 'leaves',
        lockoutBg: 'theme-bg-jungle',
        bgPattern: 'jungle-canopy',
        themeClass: 'theme-ella'
    }
};

export function getThemeFor(profileId) {
    return PROFILE_THEMES[profileId] || PROFILE_THEMES.ziva;
}

export function getCurrentTheme() {
    const meta = getCurrentProfileMeta();
    return getThemeFor(meta.id);
}

export function pickCorrectPhrase(profileId) {
    const id = profileId || getCurrentProfileMeta().id;
    const pool = STRINGS.themes[id]?.correctPhrases || STRINGS.themes.ziva.correctPhrases;
    return pickRandom(pool);
}

export function pickWrongPhrase(profileId) {
    const id = profileId || getCurrentProfileMeta().id;
    const pool = STRINGS.themes[id]?.wrongPhrases || STRINGS.themes.ziva.wrongPhrases;
    return pickRandom(pool);
}

export function applyThemeClass(el, profileId) {
    if (!el) return;
    const id = profileId || getCurrentProfileMeta().id;
    el.classList.remove('theme-ziva', 'theme-ava', 'theme-ella');
    el.classList.add(getThemeFor(id).themeClass);
}

// Scatter decoration emoji into a container. Positions are deterministic-ish
// but jittered. Returns nothing; the caller owns the container.
export function scatterDecorations(container, profileId, count = 4) {
    if (!container) return;
    const theme = getThemeFor(profileId || getCurrentProfileMeta().id);
    const decos = theme.decorations;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'profile-deco';
        el.textContent = decos[i % decos.length];
        el.style.left = (5 + (i * 83) % 90) + '%';
        el.style.top = (10 + (i * 47) % 80) + '%';
        el.style.fontSize = (1.4 + (i % 3) * 0.3) + 'rem';
        el.style.animationDelay = (i * 0.3) + 's';
        container.appendChild(el);
    }
}
