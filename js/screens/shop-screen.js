import { getState, getPowerUpInventory, addPowerUp, spendCoins, getCurrentProfileMeta } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { getCurrentTheme } from '../engine/profile-theme.js';
import { goldenGlow } from '../engine/particles.js';

const ITEMS = [
    { id: 'bonusHint', icon: '💡', name: 'Dica Extra',   desc: 'Uma dica a mais num desafio.', cost: 10 },
    { id: 'skip',      icon: '⏭️', name: 'Pular',        desc: 'Pula um desafio com 1 estrela.', cost: 40 },
    { id: 'turbo',     icon: '⚡', name: 'Turbo',        desc: 'Dobra o tempo para estrela-relâmpago no próximo desafio.', cost: 15 }
];

function renderCard(item, inv, coins) {
    const owned = inv[item.id] || 0;
    const canAfford = coins >= item.cost;
    return `
        <div class="shop-card">
            <div class="shop-card-icon">${item.icon}</div>
            <div class="shop-card-name">${item.name}</div>
            <div class="shop-card-desc">${item.desc}</div>
            <div class="shop-card-owned">Você tem: ${owned}</div>
            <button class="btn ${canAfford ? 'btn-primary' : 'btn-ghost'} shop-buy-btn" data-item="${item.id}" ${canAfford ? '' : 'disabled'}>
                💰 ${item.cost}
            </button>
        </div>
    `;
}

function rerender(container) {
    const state = getState();
    const inv = getPowerUpInventory();
    container.querySelector('#shop-coins').textContent = `💰 ${state.coins || 0}`;
    container.querySelector('#shop-grid').innerHTML = ITEMS.map(it => renderCard(it, inv, state.coins || 0)).join('');
    wireButtons(container);
}

function wireButtons(container) {
    container.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.item;
            const item = ITEMS.find(i => i.id === id);
            if (!item) return;
            if (!spendCoins(item.cost)) { sound.wrong(); return; }
            addPowerUp(id, 1);
            sound.coinCollect && sound.coinCollect();
            goldenGlow(btn);
            rerender(container);
        });
    });
}

export function enter(container) {
    const state = getState();
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();
    const inv = getPowerUpInventory();

    container.innerHTML = `
        <div class="shop-screen ${theme.themeClass}">
            <div class="top-bar" style="background:var(--profile-gradient);color:#FFF;">
                <button class="btn btn-small" id="back-btn" style="background:rgba(255,255,255,0.18);color:#FFF;border:1px solid rgba(255,255,255,0.3);">← Voltar</button>
                <span class="top-bar-title" style="color:#FFF;">🛒 Loja de Poderes</span>
                <span class="badge badge-coins" id="shop-coins">💰 ${state.coins || 0}</span>
            </div>
            <div class="shop-container">
                <p class="shop-intro">Olá, ${profile.name}! Use suas moedas para comprar poderes que ajudam nos desafios.</p>
                <div class="shop-grid" id="shop-grid">
                    ${ITEMS.map(it => renderCard(it, inv, state.coins || 0)).join('')}
                </div>
            </div>
        </div>
    `;

    wireButtons(container);
    container.querySelector('#back-btn').addEventListener('click', () => {
        sound.tap();
        navigate('islands');
    });
}

export function exit() {}
