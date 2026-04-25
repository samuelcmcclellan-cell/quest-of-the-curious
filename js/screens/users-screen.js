import { getProfiles, switchProfile } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { applyProfileTheme } from '../engine/theme.js';
import { getThemeFor } from '../engine/profile-theme.js';
import { renderCharacter, isCustomized } from '../engine/character.js';

export function enter(container) {
    const profiles = getProfiles();

    const cardsHtml = profiles.map(p => {
        const tagline = p.hasProgress
            ? `⭐ ${p.stars} estrelas · ${p.completed} desafio${p.completed === 1 ? '' : 's'}`
            : 'Comece sua aventura!';
        const gradient = `linear-gradient(135deg, ${p.color} 0%, ${shade(p.color, -20)} 100%)`;
        const theme = getThemeFor(p.id);
        const customized = isCustomized(p.character);
        const avatarHtml = customized
            ? `<div class="user-card-avatar user-card-avatar-custom" id="avatar-${p.id}"></div>`
            : `<div class="user-card-avatar">${p.avatar}</div>`;

        return `
            <button class="user-card ${theme.themeClass}" data-profile="${p.id}" style="--user-gradient:${gradient};">
                ${p.isActive ? '<div class="user-card-active-pill">Último jogador</div>' : ''}
                <div class="user-card-sidekick">${theme.sidekick}</div>
                ${avatarHtml}
                <div class="user-card-name">${p.name}</div>
                <div class="user-card-age">${p.age} anos</div>
                <div class="user-card-tagline">${tagline}</div>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="users-screen">
            <div class="users-header">
                <h1 class="users-title">
                    <span class="wave-letter" style="--i:0">A</span>
                    <span class="wave-letter" style="--i:1"> </span>
                    <span class="wave-letter" style="--i:2">J</span><span class="wave-letter" style="--i:3">o</span><span class="wave-letter" style="--i:4">r</span><span class="wave-letter" style="--i:5">n</span><span class="wave-letter" style="--i:6">a</span><span class="wave-letter" style="--i:7">d</span><span class="wave-letter" style="--i:8">a</span>
                    <br>
                    <span class="wave-letter" style="--i:9">d</span><span class="wave-letter" style="--i:10">o</span><span class="wave-letter" style="--i:11">s</span>
                    <span class="wave-letter" style="--i:12"> </span>
                    <span class="wave-letter" style="--i:13">C</span><span class="wave-letter" style="--i:14">u</span><span class="wave-letter" style="--i:15">r</span><span class="wave-letter" style="--i:16">i</span><span class="wave-letter" style="--i:17">o</span><span class="wave-letter" style="--i:18">s</span><span class="wave-letter" style="--i:19">o</span><span class="wave-letter" style="--i:20">s</span>
                </h1>
            </div>
            <div class="users-container">
                <p class="users-hello">Quem vai jogar hoje?</p>
                <div class="users-grid">
                    ${cardsHtml}
                </div>
            </div>
        </div>
    `;

    // Mount rendered characters for any customized profile cards
    profiles.forEach(p => {
        if (!isCustomized(p.character)) return;
        const slot = container.querySelector(`#avatar-${p.id}`);
        if (!slot) return;
        slot.appendChild(renderCharacter({ character: p.character, size: 72 }));
    });

    container.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.profile;
            sound.tap();
            if (switchProfile(id)) {
                sessionStorage.removeItem('quest:correctStreakSession');
                applyProfileTheme(id);
                navigate('islands');
            }
        });
    });
}

export function exit() {}

function shade(hex, pct) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
    const f = 1 + pct / 100;
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
