import { isLockedOut } from './state.js';

const routes = {};
let currentScreen = null;
let currentScreenEl = null;
let appContainer = null;

// Routes that are always permitted even when the active profile is locked.
const LOCKOUT_ALLOWLIST = new Set(['users', 'lockout']);

export function registerRoute(path, screen) {
    routes[path] = screen;
}

export function navigate(hash) {
    window.location.hash = hash;
}

export function initRouter(container) {
    appContainer = container;
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

export function getCurrentRoute() {
    const hash = window.location.hash.slice(1) || 'users';
    const [path, ...params] = hash.split('/');
    return { path, params };
}

function handleRoute() {
    const { path, params } = getCurrentRoute();

    // Belt-and-suspenders lockout guard: if the active profile is locked,
    // redirect to the lockout screen unless the target is already safe.
    if (isLockedOut() && !LOCKOUT_ALLOWLIST.has(path)) {
        navigate('lockout');
        return;
    }

    const screen = routes[path];
    if (!screen) {
        navigate('users');
        return;
    }

    if (currentScreen && currentScreen.exit) {
        currentScreen.exit();
    }
    if (currentScreenEl) {
        currentScreenEl.remove();
    }

    const screenEl = document.createElement('div');
    screenEl.className = 'screen';
    screenEl.id = `screen-${path}`;
    appContainer.appendChild(screenEl);

    currentScreen = screen;
    currentScreenEl = screenEl;
    screen.enter(screenEl, params);
}
