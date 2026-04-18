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
                ${p.isActive ? '<div class="user-card-active-pill">Last played</div>' : ''}
                <div class="user-card-avatar">${p.avatar}</div>
                <div class="user-card-name">${p.name}</div>
                <div class="user-card-age">age ${p.age}</div>
                <div class="user-card-tagline">${tagline}</div>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="users-screen">
            <div class="users-header">
                <h1 class="users-title">
                    <span class="wave-letter" style="--i:0">Q</span><span class="wave-letter" style="--i:1">u</span><span class="wave-letter" style="--i:2">e</span><span class="wave-letter" style="--i:3">s</span><span class="wave-letter" style="--i:4">t</span>
                    <span class="wave-letter" style="--i:5"> </span>
                    <span class="wave-letter" style="--i:6">o</span><span class="wave-letter" style="--i:7">f</span>
                    <span class="wave-letter" style="--i:8"> </span>
                    <span class="wave-letter" style="--i:9">t</span><span class="wave-letter" style="--i:10">h</span><span class="wave-letter" style="--i:11">e</span>
                    <br>
                    <span class="wave-letter" style="--i:12">C</span><span class="wave-letter" style="--i:13">u</span><span class="wave-letter" style="--i:14">r</span><span class="wave-letter" style="--i:15">i</span><span class="wave-letter" style="--i:16">o</span><span class="wave-letter" style="--i:17">u</span><span class="wave-letter" style="--i:18">s</span>
                </h1>
            </div>
            <div class="users-container">
                <p class="users-hello">Who's playing today?</p>
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
