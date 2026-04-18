import { getProfiles, switchProfile } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';

export function enter(container) {
    const profiles = getProfiles();

    const cardsHtml = profiles.map(p => {
        const tagline = p.hasProgress
            ? `⭐ ${p.stars} stars · ${p.completed} challenge${p.completed === 1 ? '' : 's'}`
            : 'Start your adventure!';
        const gradient = `linear-gradient(135deg, ${p.color} 0%, ${shade(p.color, -20)} 100%)`;

        return `
            <button class="user-card" data-profile="${p.id}" style="--user-gradient:${gradient};">
                ${p.isActive ? '<div class="user-card-active-pill">Active</div>' : ''}
                <div class="user-card-avatar">${p.avatar}</div>
                <div class="user-card-name">${p.name}</div>
                <div class="user-card-age">age ${p.age}</div>
                <div class="user-card-tagline">${tagline}</div>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="users-screen">
            <div class="top-bar" style="background:linear-gradient(135deg,#7C4DFF,#E91E63);color:#FFF;">
                <button class="btn btn-small" id="back-btn" style="background:transparent;color:#FFF;border:1px solid rgba(255,255,255,0.3);">← Home</button>
                <span class="top-bar-title" style="color:#FFF;">Who's playing?</span>
                <span style="width:72px;"></span>
            </div>
            <div class="users-container">
                <p class="users-hello">Tap your name to start!</p>
                <div class="users-grid">
                    ${cardsHtml}
                </div>
            </div>
        </div>
    `;

    container.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.profile;
            sound.tap();
            if (switchProfile(id)) {
                navigate('islands');
            }
        });
    });

    container.querySelector('#back-btn').addEventListener('click', () => {
        sound.tap();
        navigate('title');
    });
}

export function exit() {}

// simple shade helper so each profile card has a gradient
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
