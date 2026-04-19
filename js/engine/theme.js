export function applyProfileTheme(profileId) {
    const app = document.getElementById('app');
    if (app && profileId) app.dataset.profile = profileId;
}
