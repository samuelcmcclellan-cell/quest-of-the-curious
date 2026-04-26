import { getState, updateState, getIslandProgress, getCurrentProfileMeta, isDailyDoneToday, markDailyStarted, getNextAvailableChallenge, getAllIslandSlugs } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { getCurrentTheme, scatterDecorations } from '../engine/profile-theme.js';
import { startThemeAmbient } from '../engine/particles.js';
import { STRINGS } from '../i18n.js';

let ambientCleanup = null;

const ISLANDS = [
    {
        slug: 'numbers-reef',
        emoji: '🏝️',
        name: 'Recife dos Números',
        tagline: 'Aventuras de matemática no oceano',
        gradient: 'linear-gradient(135deg, #29B6F6 0%, #0288D1 100%)',
        mascot: '🦉'
    },
    {
        slug: 'purrfect-park',
        emoji: '🌳',
        name: 'Parque Purrfeito',
        tagline: 'Desafios de matemática cat-tásticos',
        gradient: 'linear-gradient(135deg, #81C784 0%, #388E3C 100%)',
        mascot: '🐱'
    },
    {
        slug: 'bubble-magic',
        emoji: '🫧',
        name: 'Magia das Bolhas',
        tagline: 'Quebra-cabeças mágicos de bolhas',
        gradient: 'linear-gradient(135deg, #BA68C8 0%, #6A1B9A 100%)',
        mascot: '🧙‍♀️'
    },
    {
        slug: 'crystal-rock',
        emoji: '💎',
        name: 'Rock dos Cristais',
        tagline: 'Batidas de gemas rock\'n\'roll',
        gradient: 'linear-gradient(135deg, #FF5252 0%, #D500F9 100%)',
        mascot: '🎸'
    },
    {
        slug: 'volcano-tots',
        emoji: '🌋',
        name: 'Vulcão dos Pequenos',
        tagline: 'Mais e menos com dinos',
        gradient: 'linear-gradient(135deg, #FF7043 0%, #BF360C 100%)',
        mascot: '🦖',
        profileOnly: 'ella'
    },
    {
        slug: 'jungle-tots',
        emoji: '🌴',
        name: 'Selva dos Pequenos',
        tagline: 'Quem tem mais? Quanto cabe?',
        gradient: 'linear-gradient(135deg, #66BB6A 0%, #1B5E20 100%)',
        mascot: '🦕',
        profileOnly: 'ella'
    }
];

export function enter(container) {
    const state = getState();
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();

    const cardsHtml = ISLANDS
        .filter(island => !island.profileOnly || island.profileOnly === profile.id)
        .map(island => {
        const p = getIslandProgress(island.slug);
        const pct = p.total ? Math.round((p.completed / p.total) * 100) : 0;
        const starPct = p.total ? Math.round((p.stars / (p.total * 3)) * 100) : 0;
        const stateClass = p.isComplete ? 'island-card-complete' : (p.completed > 0 ? 'island-card-started' : 'island-card-new');

        return `
            <button class="island-card ${stateClass}" data-island="${island.slug}" style="--island-gradient:${island.gradient};">
                ${p.isComplete ? '<div class="island-trophy">🏆</div>' : ''}
                <div class="island-mascot">${island.mascot}</div>
                <div class="island-card-emoji">${island.emoji}</div>
                <div class="island-card-name">${island.name}</div>
                <div class="island-card-tagline">${island.tagline}</div>
                <div class="island-card-progress">
                    <div class="island-card-progress-bar">
                        <div class="island-card-progress-fill" style="width:${pct}%;"></div>
                    </div>
                    <div class="island-card-progress-text">
                        ${p.completed}/${p.total} · ⭐ ${p.stars}/${p.total * 3}
                    </div>
                </div>
                ${p.isComplete ? '<div class="island-card-banner">Concluída!</div>' : ''}
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="islands-screen ${theme.themeClass}">
            <div class="screen-ambient" id="islands-ambient"></div>
            <div class="top-bar" style="background:var(--profile-gradient);color:#FFF;">
                <button class="btn btn-small" id="switch-btn" style="background:rgba(255,255,255,0.18);color:#FFF;border:1px solid rgba(255,255,255,0.3);font-size:0.85rem;">${profile.avatar} Trocar</button>
                <span class="top-bar-title" style="color:#FFF;">Escolha uma Ilha</span>
                <div style="display:flex;gap:6px;">
                    <span class="badge badge-stars">⭐ ${state.totalStars}</span>
                    <span class="badge badge-coins">💰 ${state.coins || 0}</span>
                </div>
            </div>
            <div class="islands-container">
                <div class="islands-hello-row">
                    <p class="islands-hello">${STRINGS.islandsGreeting(theme.accentEmoji, profile.name)}</p>
                    <div class="islands-sidekick anim-float">${theme.sidekick}</div>
                </div>
                <div class="islands-grid">
                    ${cardsHtml}
                </div>
                <div class="islands-bottom">
                    <button class="btn btn-secondary" id="daily-btn" ${isDailyDoneToday() ? 'disabled' : ''}>
                        🌟 ${isDailyDoneToday() ? 'Desafio do Dia ✓' : 'Desafio do Dia'}
                    </button>
                    <button class="btn btn-secondary" id="practice-btn">🎯 Praticar</button>
                </div>
                <div class="islands-bottom">
                    <button class="btn btn-ghost" id="shop-btn">🛒 Loja</button>
                    <button class="btn btn-ghost" id="trophies-btn">🏆 Troféus</button>
                    <button class="btn btn-ghost" id="profile-btn">😊 Perfil</button>
                </div>
            </div>
        </div>
    `;

    const ambientLayer = container.querySelector('#islands-ambient');
    scatterDecorations(ambientLayer, profile.id, 6);
    ambientCleanup = startThemeAmbient(ambientLayer, profile.id);

    container.querySelectorAll('.island-card').forEach(card => {
        card.addEventListener('click', () => {
            const slug = card.dataset.island;
            sound.tap();
            updateState(s => { s.currentIsland = slug; });
            navigate('map/' + slug);
        });
    });

    container.querySelector('#switch-btn').addEventListener('click', () => {
        sound.tap();
        navigate('users');
    });
    container.querySelector('#practice-btn').addEventListener('click', () => {
        sound.tap();
        navigate('practice');
    });
    container.querySelector('#profile-btn').addEventListener('click', () => {
        sound.tap();
        navigate('profile');
    });
    container.querySelector('#shop-btn').addEventListener('click', () => {
        sound.tap();
        navigate('shop');
    });
    container.querySelector('#trophies-btn').addEventListener('click', () => {
        sound.tap();
        navigate('trophies');
    });
    const dailyBtn = container.querySelector('#daily-btn');
    dailyBtn.addEventListener('click', () => {
        if (dailyBtn.disabled) return;
        sound.tap();
        // Pick a random island + challenge index that the player has NOT yet completed.
        const slugs = getAllIslandSlugs();
        const candidates = [];
        for (const slug of slugs) {
            const ch = getState().islands[slug]?.challenges || [];
            ch.forEach((c, i) => { if (!c.completed) candidates.push({ slug, i }); });
        }
        if (candidates.length === 0) {
            // All done — pick any random challenge for practice value, no reward stacking on fresh state
            for (const slug of slugs) {
                const ch = getState().islands[slug]?.challenges || [];
                ch.forEach((_, i) => candidates.push({ slug, i }));
            }
        }
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        sessionStorage.setItem('quest:daily-mode', '1');
        markDailyStarted();
        navigate(`challenge/${pick.slug}/${pick.i}`);
    });
}

export function exit() {
    if (ambientCleanup) {
        ambientCleanup();
        ambientCleanup = null;
    }
}
