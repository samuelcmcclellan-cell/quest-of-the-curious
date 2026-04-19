const STORAGE_KEY = 'quest-of-the-curious';

const ISLAND_SLUGS = ['numbers-reef', 'purrfect-park', 'bubble-magic', 'crystal-rock'];

const PROFILE_DEFS = [
    { id: 'ziva', name: 'Ziva', age: 8, avatar: '🔮', color: '#E91E63' },
    { id: 'ava',  name: 'Ava',  age: 5, avatar: '⚽', color: '#00BCD4' },
    { id: 'ella', name: 'Ella', age: 4, avatar: '🦕', color: '#66BB6A' }
];

const LOCKOUT_WRONG_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function makeChallenges(count) {
    return Array.from({ length: count }, () => ({
        completed: false,
        stars: 0,
        attempts: 0,
        hintsUsed: 0
    }));
}

function makeProfileDefaults(def) {
    return {
        id: def.id,
        name: def.name,
        age: def.age,
        avatar: def.avatar,
        color: def.color,
        playerName: def.name,
        character: { hat: 'none', color: def.color, face: '😊' },
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
        dailyChallenge: { lastDate: null, completed: false },
        lockout: { wrongCount: 0, lockedUntil: null }
    };
}

function makeRootDefaults() {
    const profiles = {};
    for (const def of PROFILE_DEFS) profiles[def.id] = makeProfileDefaults(def);
    return { currentProfileId: 'ziva', profiles };
}

const listeners = new Set();
let root = loadRoot();
let state = root.profiles[root.currentProfileId];

// --- island-shape migration (run once per profile) ---
function migrateProfileIslands(profile) {
    if (profile.challenges && !profile.islands) {
        profile.islands = {
            'numbers-reef':  { challenges: profile.challenges },
            'purrfect-park': { challenges: makeChallenges(10) }
        };
        delete profile.challenges;
        profile.currentIsland = 'numbers-reef';
    }
    if (!profile.islands) profile.islands = {};
    for (const slug of ISLAND_SLUGS) {
        if (!profile.islands[slug]) profile.islands[slug] = { challenges: makeChallenges(10) };
    }
    if (!profile.currentIsland) profile.currentIsland = 'numbers-reef';
    return profile;
}

function mergeProfile(def, saved) {
    // Step 1: take saved values (or {}) and run island migration BEFORE
    // overlaying defaults, so legacy flat `challenges` can correctly
    // populate islands['numbers-reef'].challenges without colliding with
    // the default empty islands.
    const savedCopy = saved ? JSON.parse(JSON.stringify(saved)) : {};
    const migratedSaved = migrateProfileIslands(savedCopy);

    // Step 2: overlay defaults for any fields the saved data is missing.
    const base = makeProfileDefaults(def);
    const merged = { ...base, ...migratedSaved };

    // Identity always wins from def
    merged.id = def.id;
    merged.name = def.name;
    merged.age = def.age;
    merged.avatar = def.avatar;
    if (!merged.color) merged.color = def.color;

    // Ensure nested objects exist with defaults filled in
    merged.character = { ...base.character, ...(migratedSaved.character || {}) };
    merged.settings  = { ...base.settings,  ...(migratedSaved.settings  || {}) };
    merged.stats     = { ...base.stats,     ...(migratedSaved.stats     || {}) };
    merged.practice  = { ...base.practice,  ...(migratedSaved.practice  || {}) };
    merged.dailyChallenge = { ...base.dailyChallenge, ...(migratedSaved.dailyChallenge || {}) };
    merged.lockout = { ...base.lockout, ...(migratedSaved.lockout || {}) };
    if (!Array.isArray(merged.achievements))    merged.achievements    = [];
    if (!Array.isArray(merged.purchasedFaces))  merged.purchasedFaces  = [];
    if (!Array.isArray(merged.purchasedHats))   merged.purchasedHats   = [];

    // Recompute totalStars from the island challenges (authoritative)
    let total = 0;
    for (const island of Object.values(merged.islands || {})) {
        for (const c of island.challenges || []) total += c.stars || 0;
    }
    merged.totalStars = total;

    return merged;
}

function migrateRoot(parsed) {
    // Case A: already new shape.
    if (parsed && parsed.profiles && typeof parsed.profiles === 'object') {
        // Legacy profile rename: 'avs' -> 'ava' (keep progress)
        if (parsed.profiles.avs && !parsed.profiles.ava) {
            parsed.profiles.ava = parsed.profiles.avs;
            delete parsed.profiles.avs;
            if (parsed.currentProfileId === 'avs') parsed.currentProfileId = 'ava';
        }
        const profiles = {};
        for (const def of PROFILE_DEFS) {
            profiles[def.id] = mergeProfile(def, parsed.profiles[def.id] || {});
        }
        const currentProfileId = profiles[parsed.currentProfileId] ? parsed.currentProfileId : 'ziva';
        return { currentProfileId, profiles };
    }
    // Case B: legacy flat single-user save -> wrap into Ziva slot.
    if (parsed && typeof parsed === 'object') {
        const profiles = {};
        profiles.ziva = mergeProfile(PROFILE_DEFS[0], parsed);
        profiles.avs  = mergeProfile(PROFILE_DEFS[1], {});
        return { currentProfileId: 'ziva', profiles };
    }
    // Case C: nothing at all.
    return makeRootDefaults();
}

function loadRoot() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return migrateRoot(JSON.parse(saved));
    } catch (e) {
        console.warn('Failed to load state:', e);
    }
    return makeRootDefaults();
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
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

// --- public API (signatures preserved where possible) ---

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
    // Reset only the ACTIVE profile (preserve sibling profile).
    const def = PROFILE_DEFS.find(d => d.id === root.currentProfileId) || PROFILE_DEFS[0];
    root.profiles[root.currentProfileId] = makeProfileDefaults(def);
    state = root.profiles[root.currentProfileId];
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

// --- profile API ---

export function getProfiles() {
    return PROFILE_DEFS.map(def => {
        const p = root.profiles[def.id];
        const stars = p ? (p.totalStars || 0) : 0;
        const completed = p
            ? ISLAND_SLUGS.reduce((sum, s) => sum + (p.islands[s]?.challenges || []).filter(c => c.completed).length, 0)
            : 0;
        return {
            id: def.id,
            name: def.name,
            age: def.age,
            avatar: def.avatar,
            color: def.color,
            stars,
            completed,
            hasProgress: stars > 0 || completed > 0,
            isActive: root.currentProfileId === def.id
        };
    });
}

export function switchProfile(profileId) {
    if (!root.profiles[profileId]) return false;
    root.currentProfileId = profileId;
    state = root.profiles[profileId];
    saveState();
    listeners.forEach(fn => fn(state));
    return true;
}

export function getProfileIslandStars(profileId, slug) {
    const p = root.profiles[profileId];
    if (!p) return 0;
    return (p.islands?.[slug]?.challenges || []).reduce((s, c) => s + (c.stars || 0), 0);
}

export function getCurrentProfileMeta() {
    const def = PROFILE_DEFS.find(d => d.id === root.currentProfileId) || PROFILE_DEFS[0];
    return {
        id: def.id,
        name: def.name,
        age: def.age,
        avatar: def.avatar,
        color: def.color
    };
}

export function hasAnyProgress() {
    return getProfiles().some(p => p.hasProgress);
}

// --- lockout API (per-profile wrong-answer time-out) ---

export function getLockoutRemainingMs(profileId) {
    const p = profileId ? root.profiles[profileId] : state;
    if (!p || !p.lockout || !p.lockout.lockedUntil) return 0;
    const remaining = p.lockout.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
}

export function isLockedOut(profileId) {
    return getLockoutRemainingMs(profileId) > 0;
}

/**
 * Record a wrong answer for the active profile.
 * Increments wrongCount; if threshold hit, sets lockedUntil and resets counter.
 * Returns { wrongCount, locked } — locked is true when this call triggered the lockout.
 */
export function recordWrongAnswer() {
    let triggered = false;
    updateState(s => {
        if (!s.lockout) s.lockout = { wrongCount: 0, lockedUntil: null };
        s.lockout.wrongCount = (s.lockout.wrongCount || 0) + 1;
        if (s.lockout.wrongCount >= LOCKOUT_WRONG_THRESHOLD) {
            s.lockout.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
            s.lockout.wrongCount = 0;
            triggered = true;
        }
    });
    return { wrongCount: state.lockout.wrongCount, locked: triggered };
}

export function resetWrongAnswers() {
    if (!state.lockout || state.lockout.wrongCount === 0) return;
    updateState(s => {
        if (!s.lockout) s.lockout = { wrongCount: 0, lockedUntil: null };
        s.lockout.wrongCount = 0;
    });
}

export function clearLockout() {
    updateState(s => {
        if (!s.lockout) s.lockout = { wrongCount: 0, lockedUntil: null };
        s.lockout.lockedUntil = null;
        s.lockout.wrongCount = 0;
    });
}

export function getWrongAnswerCount() {
    return state.lockout?.wrongCount || 0;
}

export const LOCKOUT_THRESHOLD = LOCKOUT_WRONG_THRESHOLD;
export const LOCKOUT_MS = LOCKOUT_DURATION_MS;
