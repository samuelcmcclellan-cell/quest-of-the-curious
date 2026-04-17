const STORAGE_KEY = 'quest-of-the-curious';

const ISLAND_SLUGS = ['numbers-reef', 'purrfect-park'];

function makeChallenges(count) {
    return Array.from({ length: count }, () => ({
        completed: false,
        stars: 0,
        attempts: 0,
        hintsUsed: 0
    }));
}

const DEFAULT_STATE = {
    playerName: 'Explorer',
    character: { hat: 'none', color: '#4A90D9', face: '😊' },
    islands: {
        'numbers-reef':  { challenges: makeChallenges(10) },
        'purrfect-park': { challenges: makeChallenges(10) }
    },
    currentIsland: 'numbers-reef',
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

function migrate(parsed) {
    // Legacy: flat top-level `challenges` -> move into islands['numbers-reef']
    if (parsed.challenges && !parsed.islands) {
        parsed.islands = {
            'numbers-reef': { challenges: parsed.challenges },
            'purrfect-park': { challenges: makeChallenges(10) }
        };
        delete parsed.challenges;
        parsed.currentIsland = 'numbers-reef';
    }
    // Ensure all known islands exist (forward compat if new ones added later)
    if (!parsed.islands) {
        parsed.islands = {};
    }
    for (const slug of ISLAND_SLUGS) {
        if (!parsed.islands[slug]) {
            parsed.islands[slug] = { challenges: makeChallenges(10) };
        }
    }
    if (!parsed.currentIsland) parsed.currentIsland = 'numbers-reef';
    return parsed;
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = migrate(JSON.parse(saved));
            return { ...structuredClone(DEFAULT_STATE), ...parsed };
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

function recomputeTotalStars() {
    let total = 0;
    for (const island of Object.values(state.islands || {})) {
        for (const c of island.challenges || []) total += c.stars || 0;
    }
    state.totalStars = total;
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
    recomputeTotalStars();
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

export function getIslandChallenges(slug) {
    return state.islands[slug]?.challenges || [];
}

export function getNextAvailableChallenge(slug) {
    const island = state.islands[slug || state.currentIsland];
    if (!island) return -1;
    return island.challenges.findIndex(c => !c.completed);
}

export function getIslandProgress(slug) {
    const island = state.islands[slug];
    if (!island) return { completed: 0, total: 0, stars: 0, isComplete: false };
    const completed = island.challenges.filter(c => c.completed).length;
    const stars = island.challenges.reduce((s, c) => s + c.stars, 0);
    return {
        completed,
        total: island.challenges.length,
        stars,
        isComplete: completed === island.challenges.length
    };
}

export function getAllIslandSlugs() {
    return ISLAND_SLUGS.slice();
}
