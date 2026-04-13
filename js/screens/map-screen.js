import { getState, updateState } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';

const NODE_POSITIONS = [
    { x: 50, y: 92 },
    { x: 25, y: 82 },
    { x: 72, y: 73 },
    { x: 30, y: 63 },
    { x: 65, y: 54 },
    { x: 35, y: 44 },
    { x: 70, y: 35 },
    { x: 28, y: 26 },
    { x: 60, y: 17 },
    { x: 45, y: 7 },
];

const DECORATIONS = [
    { emoji: '🐠', x: 85, y: 88, size: 1.8 },
    { emoji: '🐚', x: 12, y: 75, size: 1.4 },
    { emoji: '🪸', x: 88, y: 60, size: 1.6 },
    { emoji: '🦀', x: 10, y: 50, size: 1.5 },
    { emoji: '⚓', x: 90, y: 42, size: 1.3 },
    { emoji: '🐙', x: 8, y: 32, size: 1.7 },
    { emoji: '🏝️', x: 85, y: 20, size: 2 },
    { emoji: '⭐', x: 52, y: 2, size: 1.8 },
];

export function enter(container) {
    const state = getState();
    const nextAvailable = state.challenges.findIndex(c => !c.completed);

    container.innerHTML = `
        <div class="map-header">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <h2>🏝️ Numbers Reef</h2>
                <button class="btn btn-small" id="sound-btn" style="background:transparent;color:#FFF;font-size:1.3rem;padding:4px 8px;min-height:auto;">${state.settings.soundOn ? '🔊' : '🔇'}</button>
            </div>
            <div class="map-star-count">⭐ ${state.totalStars} / 30 stars</div>
        </div>
        <div class="map-container" id="map-scroll">
            <div class="island-path" id="island-path">
                <svg id="path-svg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
            </div>
        </div>
        <div class="map-bottom">
            <button class="btn btn-secondary" id="practice-btn">🎯 Practice</button>
            <button class="btn btn-ghost" id="profile-btn">😊 Profile</button>
        </div>
    `;

    const pathEl = container.querySelector('#island-path');
    const svgEl = container.querySelector('#path-svg');

    // Draw path lines between nodes
    for (let i = 0; i < NODE_POSITIONS.length - 1; i++) {
        const from = NODE_POSITIONS[i];
        const to = NODE_POSITIONS[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);

        const challenge = state.challenges[i];
        const nextChallenge = state.challenges[i + 1];

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
    DECORATIONS.forEach(deco => {
        const el = document.createElement('div');
        el.className = 'map-deco';
        el.textContent = deco.emoji;
        el.style.left = deco.x + '%';
        el.style.top = deco.y + '%';
        el.style.fontSize = deco.size + 'rem';
        pathEl.appendChild(el);
    });

    // Add challenge nodes
    NODE_POSITIONS.forEach((pos, i) => {
        const challenge = state.challenges[i];
        const isAvailable = i === nextAvailable;
        const isCompleted = challenge.completed;
        const isLocked = !isAvailable && !isCompleted;

        const node = document.createElement('button');
        node.className = 'map-node';

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
            node.textContent = i + 1;
        } else {
            node.classList.add('map-node-locked');
            node.textContent = '🔒';
        }

        node.style.left = pos.x + '%';
        node.style.top = pos.y + '%';

        if (!isLocked) {
            node.addEventListener('click', () => {
                navigate('challenge/' + i);
            });
        }

        pathEl.appendChild(node);
    });

    // Scroll to the next available node
    requestAnimationFrame(() => {
        const scrollContainer = container.querySelector('#map-scroll');
        const targetY = nextAvailable >= 0 ? NODE_POSITIONS[nextAvailable].y : 50;
        const scrollPercent = targetY / 100;
        const scrollTarget = (pathEl.scrollHeight - scrollContainer.clientHeight) * scrollPercent;
        scrollContainer.scrollTop = Math.max(0, scrollTarget - 100);
    });

    // Sound toggle
    container.querySelector('#sound-btn').addEventListener('click', () => {
        const newVal = !getState().settings.soundOn;
        updateState(s => { s.settings.soundOn = newVal; });
        sound.setEnabled(newVal);
        container.querySelector('#sound-btn').textContent = newVal ? '🔊' : '🔇';
    });

    // Sync sound state on load
    sound.setEnabled(state.settings.soundOn);

    // Bottom bar buttons
    container.querySelector('#practice-btn').addEventListener('click', () => {
        navigate('practice');
    });

    container.querySelector('#profile-btn').addEventListener('click', () => {
        navigate('profile');
    });
}

export function exit() {}
