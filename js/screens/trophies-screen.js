import { getState, getAchievementIds, getIslandProgress, getAllIslandSlugs, getCurrentProfileMeta } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { getCurrentTheme } from '../engine/profile-theme.js';
import { ACHIEVEMENTS } from '../engine/achievements.js';

const ISLAND_NAMES = {
    'numbers-reef': 'Recife dos Números',
    'purrfect-park': 'Parque Purrfeito',
    'bubble-magic': 'Magia das Bolhas',
    'crystal-rock': 'Rock dos Cristais'
};

export function enter(container) {
    const state = getState();
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();
    const owned = getAchievementIds();

    const islandsHtml = getAllIslandSlugs().map(slug => {
        const p = getIslandProgress(slug);
        const earned = p.isComplete;
        return `
            <div class="trophy-island ${earned ? 'trophy-island-earned' : ''}">
                <div class="trophy-island-icon">${earned ? '🏆' : '🔒'}</div>
                <div class="trophy-island-name">${ISLAND_NAMES[slug] || slug}</div>
                <div class="trophy-island-meta">${p.completed}/${p.total} · ⭐ ${p.stars}/${p.total * 3}</div>
            </div>
        `;
    }).join('');

    const achsHtml = ACHIEVEMENTS.map(a => {
        const unlocked = owned.has(a.id);
        return `
            <div class="achievement-card ${unlocked ? 'achievement-card-unlocked' : ''}">
                <div class="achievement-icon">${unlocked ? a.icon : '🔒'}</div>
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
        `;
    }).join('');

    const unlockedCount = ACHIEVEMENTS.filter(a => owned.has(a.id)).length;

    container.innerHTML = `
        <div class="trophies-screen ${theme.themeClass}">
            <div class="top-bar" style="background:var(--profile-gradient);color:#FFF;">
                <button class="btn btn-small" id="back-btn" style="background:rgba(255,255,255,0.18);color:#FFF;border:1px solid rgba(255,255,255,0.3);">← Voltar</button>
                <span class="top-bar-title" style="color:#FFF;">🏆 Sala de Troféus</span>
                <span class="badge badge-stars">⭐ ${state.totalStars}</span>
            </div>
            <div class="trophies-container">
                <h2 class="trophies-heading">Conquistas de ${profile.name} <span class="trophies-progress">(${unlockedCount}/${ACHIEVEMENTS.length})</span></h2>
                <div class="achievement-grid">${achsHtml}</div>
                <h2 class="trophies-heading">Ilhas Concluídas</h2>
                <div class="trophy-islands-grid">${islandsHtml}</div>
                <div class="trophies-stats">
                    <div class="trophy-stat"><span>🔥</span> Melhor sequência: <strong>${state.stats.streakBest || 0}</strong></div>
                    <div class="trophy-stat"><span>⚡</span> Estrelas-relâmpago: <strong>${state.stats.speedStars || 0}</strong></div>
                    <div class="trophy-stat"><span>💰</span> Moedas totais: <strong>${state.coins || 0}</strong></div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => {
        sound.tap();
        navigate('islands');
    });
}

export function exit() {}
