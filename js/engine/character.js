import { getState } from '../state.js';

export const HAT_EMOJI = {
    crown: '👑',
    tophat: '🎩',
    cap: '🧢',
    wizard: '🪄',
    pirate: '🏴‍☠️'
};

export const ACCESSORY_EMOJI = {
    none: '',
    glasses: '👓',
    sunglasses: '🕶️',
    bowtie: '🎀',
    scarf: '🧣',
    mustache: '👨',
    medal: '🏅',
    star: '⭐'
};

export const FRAMES = {
    default: { id: 'default', label: 'Padrão',  gradient: 'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)' },
    ocean:   { id: 'ocean',   label: 'Oceano',  gradient: 'linear-gradient(135deg, #81D4FA 0%, #0288D1 100%)' },
    rose:    { id: 'rose',    label: 'Rosa',    gradient: 'linear-gradient(135deg, #F8BBD0 0%, #E91E63 100%)' },
    forest:  { id: 'forest',  label: 'Floresta',gradient: 'linear-gradient(135deg, #C8E6C9 0%, #388E3C 100%)' },
    violet:  { id: 'violet',  label: 'Violeta', gradient: 'linear-gradient(135deg, #E1BEE7 0%, #7B1FA2 100%)' },
    sunset:  { id: 'sunset',  label: 'Pôr do Sol', gradient: 'linear-gradient(135deg, #FFAB91 0%, #E64A19 100%)' },
    night:   { id: 'night',   label: 'Noite',   gradient: 'linear-gradient(135deg, #90A4AE 0%, #263238 100%)' },
    rainbow: { id: 'rainbow', label: 'Arco-íris', gradient: 'linear-gradient(135deg, #FF8A80 0%, #FFD740 25%, #69F0AE 50%, #40C4FF 75%, #CE93D8 100%)' }
};

export function renderCharacter({ character, size = 48 } = {}) {
    character = character || getState().character;
    const frameId = character.frame || 'default';
    const frame = FRAMES[frameId] || FRAMES.default;

    const el = document.createElement('div');
    el.className = 'kid-character';
    el.style.setProperty('--kid-size', size + 'px');
    el.style.setProperty('--kid-frame', frame.gradient);

    const face = document.createElement('span');
    face.className = 'kid-character-face';
    face.textContent = character.face || '😊';
    el.appendChild(face);

    const accessoryId = character.accessory && character.accessory !== 'none'
        ? character.accessory : null;
    if (accessoryId && ACCESSORY_EMOJI[accessoryId]) {
        const acc = document.createElement('span');
        acc.className = 'kid-character-accessory kid-character-accessory-' + accessoryId;
        acc.textContent = ACCESSORY_EMOJI[accessoryId];
        el.appendChild(acc);
    }

    if (character.hat && character.hat !== 'none' && HAT_EMOJI[character.hat]) {
        const hat = document.createElement('span');
        hat.className = 'kid-character-hat';
        hat.textContent = HAT_EMOJI[character.hat];
        el.appendChild(hat);
    }
    return el;
}

export function isCustomized(character) {
    if (!character) return false;
    const isDefaultFace = !character.face || character.face === '😊';
    const isDefaultHat = !character.hat || character.hat === 'none';
    const isDefaultAcc = !character.accessory || character.accessory === 'none';
    const isDefaultFrame = !character.frame || character.frame === 'default';
    return !(isDefaultFace && isDefaultHat && isDefaultAcc && isDefaultFrame);
}
