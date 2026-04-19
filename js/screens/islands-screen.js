import { getState, updateState, getIslandProgress, getCurrentProfileMeta } from '../state.js';
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
    }
];

export function enter(container) {
    const state = getState();
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();

    const cardsHtml = ISLANDS.map(island => {
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
                    <button class="btn btn-secondary" id="practice-btn">🎯 Praticar</button>
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
}

export function exit() {
    if (ambientCleanup) {
        ambientCleanup();
        ambientCleanup = null;
    }
}
