import { getState, updateState, getIslandChallenges, getProfiles, getProfileIslandStars, getCurrentProfileMeta } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { ambientBubbles, ambientFish, ambientButterflies, ambientLeaves, shimmerStars, startThemeAmbient } from '../engine/particles.js';
import { renderCharacter } from '../engine/character.js';
import { getCurrentTheme } from '../engine/profile-theme.js';

const NODE_POSITIONS = [
    { x: 50, y: 95 },
    { x: 25, y: 89 },
    { x: 72, y: 83 },
    { x: 28, y: 76 },
    { x: 70, y: 70 },
    { x: 30, y: 63 },
    { x: 68, y: 56 },
    { x: 28, y: 49 },
    { x: 70, y: 42 },
    { x: 30, y: 35 },
    { x: 68, y: 28 },
    { x: 28, y: 22 },
    { x: 70, y: 16 },
    { x: 32, y: 10 },
    { x: 50, y: 4 },
];

const ISLAND_CONFIGS = {
    'numbers-reef': {
        slug: 'numbers-reef',
        name: 'Recife dos Números',
        title: '🏝️ Recife dos Números',
        mascot: '🦉',
        bgClass: 'map-bg-ocean',
        headerClass: '',
        ambient: { bubbles: true, fish: true, butterflies: false, leaves: false },
        decorations: [
            { emoji: '🐠', x: 85, y: 88, size: 1.8 },
            { emoji: '🐚', x: 12, y: 75, size: 1.4 },
            { emoji: '🪸', x: 88, y: 60, size: 1.6 },
            { emoji: '🦀', x: 10, y: 50, size: 1.5 },
            { emoji: '⚓', x: 90, y: 42, size: 1.3 },
            { emoji: '🐙', x: 8, y: 32, size: 1.7 },
            { emoji: '🏝️', x: 85, y: 20, size: 2 },
            { emoji: '⭐', x: 12, y: 2, size: 1.6 },
        ]
    },
    'purrfect-park': {
        slug: 'purrfect-park',
        name: 'Parque Purrfeito',
        title: '🌳 Parque Purrfeito',
        mascot: '🐱',
        bgClass: 'map-bg-park',
        headerClass: 'map-header-park',
        ambient: { bubbles: false, fish: false, butterflies: true, leaves: true },
        decorations: [
            { emoji: '🐱', x: 85, y: 88, size: 1.9 },
            { emoji: '🧶', x: 12, y: 75, size: 1.4 },
            { emoji: '🌸', x: 88, y: 60, size: 1.6 },
            { emoji: '🦋', x: 10, y: 50, size: 1.5 },
            { emoji: '🏠', x: 90, y: 42, size: 1.5 },
            { emoji: '🌳', x: 8, y: 32, size: 1.9 },
            { emoji: '🐾', x: 85, y: 20, size: 1.6 },
            { emoji: '⭐', x: 12, y: 2, size: 1.6 },
        ]
    },
    'bubble-magic': {
        slug: 'bubble-magic',
        name: 'Magia das Bolhas',
        title: '🫧 Magia das Bolhas',
        mascot: '🧙‍♀️',
        bgClass: 'map-bg-bubble',
        headerClass: 'map-header-bubble',
        ambient: { bubbles: true, fish: false, butterflies: false, leaves: false },
        decorations: [
            { emoji: '🧙‍♀️', x: 85, y: 88, size: 1.8 },
            { emoji: '🫧', x: 12, y: 78, size: 1.6 },
            { emoji: '✨', x: 88, y: 60, size: 1.4 },
            { emoji: '🧚', x: 10, y: 52, size: 1.6 },
            { emoji: '🌙', x: 90, y: 40, size: 1.5 },
            { emoji: '🔮', x: 8, y: 30, size: 1.8 },
            { emoji: '🪄', x: 85, y: 20, size: 1.6 },
            { emoji: '⭐', x: 12, y: 2, size: 1.6 },
        ]
    },
    'crystal-rock': {
        slug: 'crystal-rock',
        name: 'Rock dos Cristais',
        title: '💎 Rock dos Cristais',
        mascot: '🎸',
        bgClass: 'map-bg-crystal',
        headerClass: 'map-header-crystal',
        ambient: { bubbles: false, fish: false, butterflies: false, leaves: false },
        decorations: [
            { emoji: '🎸', x: 85, y: 88, size: 1.9 },
            { emoji: '🥁', x: 12, y: 76, size: 1.5 },
            { emoji: '💎', x: 88, y: 58, size: 1.7 },
            { emoji: '🎤', x: 10, y: 50, size: 1.6 },
            { emoji: '🎹', x: 90, y: 40, size: 1.5 },
            { emoji: '🎧', x: 8, y: 28, size: 1.6 },
            { emoji: '🎵', x: 85, y: 18, size: 1.7 },
            { emoji: '⭐', x: 12, y: 2, size: 1.6 },
        ]
    }
};

let cleanupFns = [];

export function enter(container, params) {
    // Resolve island slug: param[0] if present, else state.currentIsland, else default.
    const state = getState();
    let islandSlug = params && params[0] ? params[0] : state.currentIsland || 'numbers-reef';
    if (!ISLAND_CONFIGS[islandSlug]) islandSlug = 'numbers-reef';
    const config = ISLAND_CONFIGS[islandSlug];

    // Persist current island
    updateState(s => { s.currentIsland = islandSlug; });

    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();
    const islandChallenges = getIslandChallenges(islandSlug);
    const nextAvailable = islandChallenges.findIndex(c => !c.completed);
    const completedCount = islandChallenges.filter(c => c.completed).length;
    const total = islandChallenges.length;
    const progressPct = Math.round((completedCount / total) * 100);
    const starSum = islandChallenges.reduce((sum, c) => sum + c.stars, 0);

    container.innerHTML = `
        <div class="map-header ${config.headerClass} ${theme.themeClass}">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <button class="btn btn-small" id="islands-btn" style="background:transparent;color:#FFF;font-size:0.85rem;padding:4px 10px;min-height:auto;border:1px solid rgba(255,255,255,0.3);">🗺️ Ilhas</button>
                <h2 style="margin:0;">${config.title} <span class="map-header-sidekick">${theme.sidekick}</span></h2>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="btn btn-small" id="music-btn" style="background:transparent;color:#FFF;font-size:1.2rem;padding:4px 8px;min-height:auto;">🎵</button>
                    <button class="btn btn-small" id="sound-btn" style="background:transparent;color:#FFF;font-size:1.2rem;padding:4px 8px;min-height:auto;">${state.settings.soundOn ? '🔊' : '🔇'}</button>
                </div>
            </div>
            <div class="map-star-count">⭐ ${starSum} / ${total * 3} &nbsp; 💰 ${state.coins || 0}</div>
            <div style="background:rgba(255,255,255,0.2);border-radius:99px;height:8px;margin-top:6px;overflow:hidden;">
                <div style="background:var(--profile-gradient);height:100%;width:${progressPct}%;border-radius:99px;transition:width 0.5s;"></div>
            </div>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.7);margin-top:2px;">${completedCount}/${total} desafios concluídos</div>
        </div>
        <div class="family-strip" id="family-strip"></div>
        <div class="map-container ${config.bgClass}" id="map-scroll">
            <div class="island-path" id="island-path">
                <svg id="path-svg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
                <div class="map-ambient" id="map-ambient"></div>
            </div>
        </div>
        <div class="map-bottom">
            <button class="btn btn-secondary" id="practice-btn">🎯 Praticar</button>
            <button class="btn btn-ghost" id="profile-btn">😊 Perfil</button>
        </div>
    `;

    const pathEl = container.querySelector('#island-path');
    const svgEl = container.querySelector('#path-svg');
    const ambientLayer = container.querySelector('#map-ambient');

    // Draw path lines between nodes
    for (let i = 0; i < NODE_POSITIONS.length - 1 && i < total - 1; i++) {
        const from = NODE_POSITIONS[i];
        const to = NODE_POSITIONS[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);

        const challenge = islandChallenges[i];
        const nextChallenge = islandChallenges[i + 1];

        if (challenge.completed && (nextChallenge.completed || i + 1 === nextAvailable)) {
            line.classList.add('path-line', 'path-line-complete');
        } else if (i + 1 === nextAvailable || i === nextAvailable) {
            line.classList.add('path-line', 'path-line-available');
        } else {
            line.classList.add('path-line', 'path-line-locked');
        }

        svgEl.appendChild(line);
    }

    // Add decorations
    config.decorations.forEach(deco => {
        const el = document.createElement('div');
        el.className = 'map-deco';
        el.textContent = deco.emoji;
        el.style.left = deco.x + '%';
        el.style.top = deco.y + '%';
        el.style.fontSize = deco.size + 'rem';
        pathEl.appendChild(el);
    });

    // Add challenge nodes
    const nodeEls = [];
    NODE_POSITIONS.slice(0, total).forEach((pos, i) => {
        const challenge = islandChallenges[i];
        const isAvailable = i === nextAvailable;
        const isCompleted = challenge.completed;
        const isLocked = !isAvailable && !isCompleted;
        const isBoss = i === total - 1;

        const node = document.createElement('button');
        node.className = 'map-node';
        if (isBoss) node.classList.add('map-node-boss');

        if (isCompleted) {
            node.classList.add('map-node-completed');
            node.textContent = '✓';
            if (challenge.stars > 0) {
                const badge = document.createElement('span');
                badge.className = 'map-node-stars';
                badge.textContent = '⭐'.repeat(challenge.stars);
                node.appendChild(badge);
            }
        } else if (isAvailable) {
            node.classList.add('map-node-available');
            node.textContent = isBoss ? '👑' : (i + 1);
        } else {
            node.classList.add('map-node-locked');
            node.textContent = isBoss ? '👑' : '🔒';
        }

        if (isBoss) {
            const ribbon = document.createElement('span');
            ribbon.className = 'map-node-boss-ribbon';
            ribbon.textContent = 'Chefe';
            node.appendChild(ribbon);
        }

        node.style.left = pos.x + '%';
        node.style.top = pos.y + '%';

        if (!isLocked) {
            node.addEventListener('click', () => {
                sound.tap();
                navigate(`challenge/${islandSlug}/${i}`);
            });
        }

        pathEl.appendChild(node);
        if (isCompleted) nodeEls.push(node);
    });

    // Player token at the kid's current node
    const currentIndex = nextAvailable >= 0 ? nextAvailable : Math.max(0, total - 1);
    const tokenPos = NODE_POSITIONS[currentIndex];
    if (tokenPos) {
        const token = document.createElement('div');
        token.className = 'player-token';
        token.style.left = tokenPos.x + '%';
        token.style.top = tokenPos.y + '%';
        token.appendChild(renderCharacter({ character: state.character, size: 52 }));
        pathEl.appendChild(token);
    }

    // Family Progress strip (siblings' avatars + stars for THIS island)
    const stripEl = container.querySelector('#family-strip');
    if (stripEl) {
        const allProfiles = getProfiles();
        allProfiles.forEach(p => {
            const stars = getProfileIslandStars(p.id, islandSlug);
            const member = document.createElement('div');
            member.className = 'family-member' + (p.isActive ? ' family-member-active' : '');
            member.dataset.profile = p.id;
            member.innerHTML = `
                <div class="family-avatar">${p.avatar}</div>
                <div class="family-name">${p.name}</div>
                <div class="family-stars">⭐ ${stars}</div>
            `;
            stripEl.appendChild(member);
        });
    }

    // Shimmer on completed nodes
    requestAnimationFrame(() => {
        nodeEls.forEach(node => {
            const cleanup = shimmerStars(node);
            cleanupFns.push(cleanup);
        });
    });

    // Ambient effects per island config
    if (config.ambient.bubbles) cleanupFns.push(ambientBubbles(ambientLayer));
    if (config.ambient.fish) cleanupFns.push(ambientFish(ambientLayer));
    if (config.ambient.butterflies) cleanupFns.push(ambientButterflies(ambientLayer));
    if (config.ambient.leaves) cleanupFns.push(ambientLeaves(ambientLayer));

    // Profile-themed ambient on top of island ambient (lighter touch)
    const themeAmbient = startThemeAmbient(ambientLayer, profile.id);
    if (themeAmbient) cleanupFns.push(themeAmbient);

    // Scroll to the next available node
    requestAnimationFrame(() => {
        const scrollContainer = container.querySelector('#map-scroll');
        const targetY = nextAvailable >= 0 ? NODE_POSITIONS[nextAvailable].y : 50;
        const scrollPercent = targetY / 100;
        const scrollTarget = (pathEl.scrollHeight - scrollContainer.clientHeight) * scrollPercent;
        scrollContainer.scrollTop = Math.max(0, scrollTarget - 100);
    });

    // Islands button
    container.querySelector('#islands-btn').addEventListener('click', () => {
        sound.tap();
        navigate('islands');
    });

    // Sound toggle
    container.querySelector('#sound-btn').addEventListener('click', () => {
        const newVal = !getState().settings.soundOn;
        updateState(s => { s.settings.soundOn = newVal; });
        sound.setEnabled(newVal);
        container.querySelector('#sound-btn').textContent = newVal ? '🔊' : '🔇';
    });

    // Music toggle
    container.querySelector('#music-btn').addEventListener('click', () => {
        const newVal = !getState().settings.musicOn;
        updateState(s => { s.settings.musicOn = newVal; });
        sound.bgMusic(newVal);
        container.querySelector('#music-btn').style.opacity = newVal ? '1' : '0.5';
    });

    sound.setEnabled(state.settings.soundOn);
    if (state.settings.musicOn) sound.bgMusic(true);
    container.querySelector('#music-btn').style.opacity = state.settings.musicOn ? '1' : '0.5';

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
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
}
