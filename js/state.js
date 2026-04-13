const STORAGE_KEY = 'quest-of-the-curious';

const DEFAULT_STATE = {
    playerName: 'Explorer',
    character: { hat: 'none', color: '#4A90D9', face: '😊' },
    challenges: Array.from({ length: 10 }, () => ({
        completed: false,
        stars: 0,
        attempts: 0,
        hintsUsed: 0
    })),
    totalStars: 0,
    coins: 0,
    achievements: [],
    purchasedFaces: [],
    purchasedHats: [],
    settings: { soundOn: true, musicOn: false },
    stats: {
        totalChallenges: 0,
        totalCorrect: 0,
        streakCurrent: 0,
        streakBest: 0
    },
    practice: { difficulty: 1, history: [] },
    dailyChallenge: { lastDate: null, completed: false }
};

const listeners = new Set();
let state = loadState();

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_STATE, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load state:', e);
    }
    return structuredClone(DEFAULT_STATE);
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

export function getState() {
    return state;
}

export function updateState(updater) {
    if (typeof updater === 'function') {
        updater(state);
    } else {
        Object.assign(state, updater);
    }
    state.totalStars = state.challenges.reduce((sum, c) => sum + c.stars, 0);
    saveState();
    listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function resetState() {
    state = structuredClone(DEFAULT_STATE);
    saveState();
    listeners.forEach(fn => fn(state));
}

export function getNextAvailableChallenge() {
    return state.challenges.findIndex(c => !c.completed);
}
