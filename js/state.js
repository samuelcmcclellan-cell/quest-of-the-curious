const STORAGE_KEY = 'quest-of-the-curious';

const ISLAND_SLUGS_BY_PROFILE = {
    ziva: ['numbers-reef', 'purrfect-park', 'bubble-magic', 'crystal-rock'],
    ava:  ['numbers-reef', 'purrfect-park', 'bubble-magic', 'crystal-rock'],
    ella: ['numbers-reef', 'purrfect-park', 'bubble-magic', 'crystal-rock', 'volcano-tots', 'jungle-tots']
};
const ISLAND_SLUGS = ISLAND_SLUGS_BY_PROFILE.ziva;
const CHALLENGES_PER_ISLAND = 15;

const PROFILE_DEFS = [
    { id: 'ziva', name: 'Ziva', age: 8, avatar: '🔮', color: '#E91E63' },
    { id: 'ava',  name: 'Ava',  age: 5, avatar: '🐺', color: '#00BCD4' },
    { id: 'ella', name: 'Ella', age: 4, avatar: '🦕', color: '#66BB6A' }
];

const LOCKOUT_WRONG_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const LOCKOUT_FIRST_DURATION_MS = 60 * 1000;
const LOCKOUT_COUNT_KEY = 'quest:lockoutCountSession';

function slugsFor(profileId) {
    return ISLAND_SLUGS_BY_PROFILE[profileId] || ISLAND_SLUGS;
}

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
        character: { hat: 'none', color: def.color, face: '😊', accessory: 'none', frame: 'default' },
        islands: {
            'numbers-reef':  { challenges: makeChallenges(CHALLENGES_PER_ISLAND) },
            'purrfect-park': { challenges: makeChallenges(CHALLENGES_PER_ISLAND) }
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
            streakBest: 0,
            speedStars: 0,
            comboBest: 0
        },
        practice: { difficulty: 1, history: [] },
        dailyChallenge: { lastDate: null, completed: false, streakDays: 0 },
        powerUps: { bonusHint: 0, skip: 0, turbo: 0 },
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
function migrateProfileIslands(profile, slugs) {
    const slugList = slugs || ISLAND_SLUGS;
    if (profile.challenges && !profile.islands) {
        profile.islands = {
            'numbers-reef':  { challenges: profile.challenges },
            'purrfect-park': { challenges: makeChallenges(CHALLENGES_PER_ISLAND) }
        };
        delete profile.challenges;
        profile.currentIsland = 'numbers-reef';
    }
    if (!profile.islands) profile.islands = {};
    for (const slug of slugList) {
        if (!profile.islands[slug]) {
            profile.islands[slug] = { challenges: makeChallenges(CHALLENGES_PER_ISLAND) };
            continue;
        }
        const island = profile.islands[slug];
        if (!Array.isArray(island.challenges)) {
            island.challenges = makeChallenges(CHALLENGES_PER_ISLAND);
            continue;
        }
        if (island.challenges.length < CHALLENGES_PER_ISLAND) {
            const needed = CHALLENGES_PER_ISLAND - island.challenges.length;
            island.challenges.push(...makeChallenges(needed));
        }
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
    const migratedSaved = migrateProfileIslands(savedCopy, slugsFor(def.id));

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
    merged.powerUps = { ...base.powerUps, ...(migratedSaved.powerUps || {}) };
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
    return slugsFor(root.currentProfileId).slice();
}

// --- profile API ---

export function getProfiles() {
    return PROFILE_DEFS.map(def => {
        const p = root.profiles[def.id];
        const stars = p ? (p.totalStars || 0) : 0;
        const completed = p
            ? slugsFor(def.id).reduce((sum, s) => sum + (p.islands[s]?.challenges || []).filter(c => c.completed).length, 0)
            : 0;
        return {
            id: def.id,
            name: def.name,
            age: def.age,
            avatar: def.avatar,
            color: def.color,
            character: p?.character || null,
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

// Tier helpers — single source of truth for the age-based branching
// scattered across screens and challenge classes. Pass either a profile
// object (with .age) or omit to read the active profile.
export function isToddlerTier(profile) {
    const age = (profile?.age ?? getCurrentProfileMeta().age) || 8;
    return age <= 4;
}

export function isJuniorTier(profile) {
    const age = (profile?.age ?? getCurrentProfileMeta().age) || 8;
    return age >= 5 && age <= 6;
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
 * Lockout duration escalates per session: first lockout = 1 min, every
 * subsequent lockout in the same session = 5 min.
 * Returns { wrongCount, locked } — locked is true when this call triggered the lockout.
 */
export function recordWrongAnswer() {
    let triggered = false;
    let durationMs = LOCKOUT_DURATION_MS;
    const wouldTrigger = ((state.lockout?.wrongCount || 0) + 1) >= LOCKOUT_WRONG_THRESHOLD;
    if (wouldTrigger) {
        let priorLockouts = 0;
        try {
            priorLockouts = parseInt(sessionStorage.getItem(LOCKOUT_COUNT_KEY) || '0', 10) || 0;
        } catch (e) { /* sessionStorage unavailable */ }
        durationMs = priorLockouts === 0 ? LOCKOUT_FIRST_DURATION_MS : LOCKOUT_DURATION_MS;
    }
    updateState(s => {
        if (!s.lockout) s.lockout = { wrongCount: 0, lockedUntil: null };
        s.lockout.wrongCount = (s.lockout.wrongCount || 0) + 1;
        if (s.lockout.wrongCount >= LOCKOUT_WRONG_THRESHOLD) {
            s.lockout.lockedUntil = Date.now() + durationMs;
            s.lockout.lockoutDurationMs = durationMs;
            s.lockout.wrongCount = 0;
            triggered = true;
        }
    });
    if (triggered) {
        try {
            const prior = parseInt(sessionStorage.getItem(LOCKOUT_COUNT_KEY) || '0', 10) || 0;
            sessionStorage.setItem(LOCKOUT_COUNT_KEY, String(prior + 1));
        } catch (e) { /* sessionStorage unavailable */ }
    }
    return { wrongCount: state.lockout.wrongCount, locked: triggered };
}

export function getLockoutDurationMs() {
    return state.lockout?.lockoutDurationMs || LOCKOUT_DURATION_MS;
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

// --- achievements API ---

export function getAchievementIds() {
    const list = state.achievements;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map(a => typeof a === 'string' ? a : a.id));
}

export function unlockAchievement(id) {
    const owned = getAchievementIds();
    if (owned.has(id)) return false;
    updateState(s => {
        if (!Array.isArray(s.achievements)) s.achievements = [];
        s.achievements.push({ id, at: Date.now() });
    });
    return true;
}

// --- power-ups API ---

export function getPowerUpInventory() {
    return { ...(state.powerUps || {}) };
}

export function addPowerUp(kind, qty = 1) {
    updateState(s => {
        if (!s.powerUps) s.powerUps = { bonusHint: 0, skip: 0, turbo: 0 };
        s.powerUps[kind] = (s.powerUps[kind] || 0) + qty;
    });
}

export function consumePowerUp(kind) {
    if (!(state.powerUps && state.powerUps[kind] > 0)) return false;
    updateState(s => { s.powerUps[kind] -= 1; });
    return true;
}

export function spendCoins(amount) {
    if ((state.coins || 0) < amount) return false;
    updateState(s => { s.coins = (s.coins || 0) - amount; });
    return true;
}

// --- daily challenge API ---

export function getTodayStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isDailyDoneToday() {
    const today = getTodayStamp();
    const dc = state.dailyChallenge || {};
    return dc.lastDate === today && dc.completed === true;
}

export function markDailyStarted() {
    const today = getTodayStamp();
    updateState(s => {
        if (!s.dailyChallenge) s.dailyChallenge = {};
        if (s.dailyChallenge.lastDate !== today) {
            s.dailyChallenge.lastDate = today;
            s.dailyChallenge.completed = false;
        }
    });
}

export function markDailyCompleted() {
    const today = getTodayStamp();
    updateState(s => {
        if (!s.dailyChallenge) s.dailyChallenge = {};
        const prev = s.dailyChallenge.lastDate;
        const yesterday = yesterdayStamp();
        if (prev === yesterday) {
            s.dailyChallenge.streakDays = (s.dailyChallenge.streakDays || 0) + 1;
        } else if (prev !== today) {
            s.dailyChallenge.streakDays = 1;
        }
        s.dailyChallenge.lastDate = today;
        s.dailyChallenge.completed = true;
    });
}

function yesterdayStamp() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
