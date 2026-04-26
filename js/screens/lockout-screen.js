import { getCurrentProfileMeta, getLockoutRemainingMs, clearLockout, getLockoutDurationMs, isToddlerTier, isJuniorTier } from '../state.js';
import { navigate } from '../router.js';
import { getCurrentTheme } from '../engine/profile-theme.js';
import { STRINGS, pickRandom } from '../i18n.js';
import * as sound from '../engine/sound.js';
import * as speech from '../engine/speech.js';
import { confetti, startThemeAmbient } from '../engine/particles.js';

let tickInterval = null;
let ambientCleanup = null;
let released = false;

function formatMMSS(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function enter(container) {
    released = false;
    sessionStorage.removeItem('quest:correctStreakSession');
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();
    const encouragement = pickRandom(STRINGS.lockout.encouragements);

    const initialMs = getLockoutRemainingMs();
    if (initialMs <= 0) {
        // Already cleared — send home.
        navigate('users');
        return;
    }

    const initialLabel = formatMMSS(initialMs);

    const tierClass = isToddlerTier(profile) ? 'tier-toddler'
        : isJuniorTier(profile) ? 'tier-junior' : 'tier-older';

    container.innerHTML = `
        <div class="lockout-screen ${theme.lockoutBg} ${theme.themeClass} ${tierClass}">
            <div class="lockout-ambient" id="lockout-ambient"></div>

            <div class="lockout-content">
                <div class="lockout-mascot-row">
                    <div class="lockout-speech">${STRINGS.lockout.speechBubble}</div>
                    <div class="lockout-mascot anim-float">
                        <span class="lockout-mascot-main">${theme.displayAvatar}</span>
                        <span class="lockout-mascot-side">${theme.sidekick}</span>
                    </div>
                </div>

                <div class="lockout-timer-wrap">
                    <svg class="lockout-ring" viewBox="0 0 120 120" aria-hidden="true">
                        <circle class="lockout-ring-track" cx="60" cy="60" r="54" />
                        <circle class="lockout-ring-progress" id="lockout-ring-progress" cx="60" cy="60" r="54" />
                    </svg>
                    <div class="lockout-timer" id="lockout-timer">${initialLabel}</div>
                </div>

                <p class="lockout-encouragement">${encouragement}</p>

                <div class="lockout-buttons">
                    <button class="btn btn-primary btn-large" id="switch-btn">${STRINGS.lockout.switchPlayer}</button>
                    <button class="btn btn-ghost lockout-home-btn" id="home-btn" disabled>
                        🔒 ${STRINGS.lockout.home} <span class="lockout-home-mini" id="lockout-mini">${initialLabel}</span>
                    </button>
                </div>

                <button class="lockout-why-btn" id="why-btn" aria-label="${STRINGS.lockout.why}">?</button>
                <span class="lockout-why-label">${STRINGS.lockout.why}</span>
            </div>

            <div class="lockout-modal" id="why-modal" hidden>
                <div class="lockout-modal-card">
                    <div class="lockout-modal-title">${profile.avatar} ${STRINGS.lockout.why}</div>
                    <p class="lockout-modal-body">${STRINGS.lockout.whyBody}</p>
                    <button class="btn btn-primary" id="why-close">OK</button>
                </div>
            </div>
        </div>
    `;

    const ringEl = container.querySelector('#lockout-ring-progress');
    const timerEl = container.querySelector('#lockout-timer');
    const miniEl = container.querySelector('#lockout-mini');

    const CIRC = 2 * Math.PI * 54;
    ringEl.style.strokeDasharray = String(CIRC);

    const updateTick = () => {
        const ms = getLockoutRemainingMs();
        const label = formatMMSS(ms);
        timerEl.textContent = label;
        if (miniEl) miniEl.textContent = label;

        const pct = Math.max(0, Math.min(1, ms / getLockoutDurationMs()));
        ringEl.style.strokeDashoffset = String(CIRC * (1 - pct));

        if (ms <= 0 && !released) {
            released = true;
            releaseAndGo(container);
        }
    };

    updateTick();
    tickInterval = setInterval(updateTick, 1000);

    container.querySelector('#switch-btn').addEventListener('click', () => {
        sound.tap();
        navigate('users');
    });

    // Home button is disabled while locked — no handler required, but show feedback
    container.querySelector('#home-btn').addEventListener('click', (e) => {
        e.preventDefault();
        sound.tap();
    });

    const modal = container.querySelector('#why-modal');
    container.querySelector('#why-btn').addEventListener('click', () => {
        sound.tap();
        modal.hidden = false;
    });
    container.querySelector('#why-close').addEventListener('click', () => {
        sound.tap();
        modal.hidden = true;
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
    });

    // Ambient particles per theme
    const ambientLayer = container.querySelector('#lockout-ambient');
    ambientCleanup = startThemeAmbient(ambientLayer, profile.id);

    if (speech.isSupported() && encouragement) {
        speech.speakPhrase(encouragement, { toddlerMode: isToddlerTier(profile) });
    }
}

function releaseAndGo(container) {
    clearLockout();
    sound.whoosh();
    confetti(30);

    const captionEl = document.createElement('div');
    captionEl.className = 'lockout-release-caption anim-fade-in';
    captionEl.textContent = STRINGS.lockout.autoRelease;
    container.querySelector('.lockout-screen')?.appendChild(captionEl);

    setTimeout(() => {
        navigate('islands');
    }, 900);
}

export function exit() {
    speech.cancel();
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
    if (ambientCleanup) {
        ambientCleanup();
        ambientCleanup = null;
    }
    released = false;
}
