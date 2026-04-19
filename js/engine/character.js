import { getState } from '../state.js';

const HAT_EMOJI = {
    crown: '👑',
    tophat: '🎩',
    cap: '🧢',
    wizard: '🪄',
    pirate: '🏴‍☠️'
};

export function renderCharacter({ character, size = 48 } = {}) {
    character = character || getState().character;
    const el = document.createElement('div');
    el.className = 'kid-character';
    el.style.setProperty('--kid-size', size + 'px');

    const face = document.createElement('span');
    face.className = 'kid-character-face';
    face.textContent = character.face || '😊';
    el.appendChild(face);

    if (character.hat && character.hat !== 'none' && HAT_EMOJI[character.hat]) {
        const hat = document.createElement('span');
        hat.className = 'kid-character-hat';
        hat.textContent = HAT_EMOJI[character.hat];
        el.appendChild(hat);
    }
    return el;
}
