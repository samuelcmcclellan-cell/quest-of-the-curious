const routes = {};
let currentScreen = null;
let currentScreenEl = null;
let appContainer = null;

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
    const hash = window.location.hash.slice(1) || 'title';
    const [path, ...params] = hash.split('/');
    return { path, params };
}

function handleRoute() {
    const { path, params } = getCurrentRoute();

    const screen = routes[path];
    if (!screen) {
        navigate('title');
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
