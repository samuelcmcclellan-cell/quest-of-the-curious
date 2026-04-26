import { getState, updateState, getCurrentProfileMeta, getWrongAnswerCount, LOCKOUT_THRESHOLD, consumePowerUp, getPowerUpInventory, markDailyCompleted, getNextAvailableChallenge } from '../state.js';
import { navigate } from '../router.js';
import { MultipleChoice } from '../challenges/multiple-choice.js';
import { NumberBuilder } from '../challenges/number-builder.js';
import { BalanceScale } from '../challenges/balance-scale.js';
import { SequenceNext } from '../challenges/sequence-next.js';
import { FractionVisual } from '../challenges/fraction-visual.js';
import { WordProblem } from '../challenges/word-problem.js';
import * as sound from '../engine/sound.js';
import * as speech from '../engine/speech.js';
import { getCurrentTheme, pickCorrectPhrase, pickWrongPhrase } from '../engine/profile-theme.js';
import { checkAchievements } from '../engine/achievements.js';
import { STRINGS } from '../i18n.js';

const CHALLENGE_TYPES = {
    'multiple-choice': MultipleChoice,
    'number-builder': NumberBuilder,
    'balance-scale': BalanceScale,
    'sequence-next': SequenceNext,
    'fraction-visual': FractionVisual,
    'word-problem': WordProblem,
};

const ISLAND_MASCOTS = {
    'numbers-reef': '🦉',
    'purrfect-park': '🐱',
    'bubble-magic': '🧙‍♀️',
    'crystal-rock': '🎸',
    'volcano-tots': '🦖',
    'jungle-tots': '🦕'
};

let currentChallenge = null;
let wrongListener = null;
let correctListener = null;
let speechTimer = null;
let timerInterval = null;
const dataCache = new Map();

async function loadChallengeData(islandSlug) {
    const age = getCurrentProfileMeta().age || 8;
    const variant = age <= 4 ? '-toddler' : age <= 6 ? '-junior' : '';
    const key = islandSlug + variant;
    if (dataCache.has(key)) return dataCache.get(key);
    const response = await fetch(`./data/${islandSlug}${variant}.json`);
    const data = await response.json();
    dataCache.set(key, data);
    return data;
}

function parseParams(params) {
    if (!params || params.length === 0) {
        return { islandSlug: getState().currentIsland || 'numbers-reef', index: 0 };
    }
    const first = params[0];
    const isIndexOnly = /^\d+$/.test(first);
    if (isIndexOnly) {
        return { islandSlug: getState().currentIsland || 'numbers-reef', index: parseInt(first, 10) };
    }
    return { islandSlug: first, index: parseInt(params[1] || '0', 10) };
}

function renderHeartStrip(count) {
    const pips = [];
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
        const filled = i < count;
        pips.push(`<span class="heart-pip ${filled ? 'heart-pip-filled' : ''}" aria-hidden="true">♥</span>`);
    }
    return pips.join('');
}

function updateHeartStrip(container, count) {
    const strip = container.querySelector('#heart-strip');
    if (!strip) return;
    strip.innerHTML = renderHeartStrip(count);
    if (count > 0) strip.classList.add('anim-shake');
    setTimeout(() => strip?.classList.remove('anim-shake'), 400);
}

function showSpeech(container, text) {
    const bubble = container.querySelector('#mascot-speech');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove('anim-fade-in');
    void bubble.offsetWidth;
    bubble.classList.add('anim-fade-in');
    bubble.style.opacity = '1';
    if (speech.isSupported() && text) {
        const profile = getCurrentProfileMeta();
        const dropEmojiCounts = profile?.id === 'ella' || profile?.id === 'ava';
        speech.speak(text, { toddlerMode: dropEmojiCounts });
    }
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = setTimeout(() => {
        bubble.style.opacity = '0';
    }, 2500);
}

function comboLevel(streak) {
    if (streak >= 7) return 3;
    if (streak >= 5) return 2;
    if (streak >= 3) return 1;
    return 0;
}

function renderCombo(container, streak) {
    const badge = container.querySelector('#streak-badge');
    if (!badge) return;
    if (streak < 2) {
        badge.style.display = 'none';
        return;
    }
    const lvl = comboLevel(streak);
    badge.className = `streak-badge combo-lvl-${lvl}`;
    badge.style.display = 'flex';
    const flame = lvl >= 3 ? '🔥🔥🔥' : lvl >= 2 ? '🔥🔥' : '🔥';
    badge.innerHTML = `<span class="combo-flame">${flame}</span> sequência de <span id="streak-count">${streak}</span>!`;
}

function startTimer(container) {
    const timerEl = container.querySelector('#challenge-timer');
    if (!timerEl) return;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!currentChallenge) return;
        const secs = Math.floor(currentChallenge.getElapsedMs() / 1000);
        timerEl.textContent = `⏱️ ${secs}s`;
    }, 500);
}

export async function enter(container, params) {
    speech.cancel();
    const { islandSlug, index: challengeIndex } = parseParams(params);
    const state = getState();
    const profile = getCurrentProfileMeta();
    const theme = getCurrentTheme();

    let data;
    try {
        data = await loadChallengeData(islandSlug);
    } catch (e) {
        console.warn('Failed to load island data:', islandSlug, e);
        navigate('islands');
        return;
    }

    const challenge = data.challenges[challengeIndex];
    if (!challenge) {
        navigate('map/' + islandSlug);
        return;
    }

    const islandMascot = ISLAND_MASCOTS[islandSlug] || '🦉';
    const islandChallenges = state.islands[islandSlug]?.challenges || [];
    const difficulty = challenge.difficulty || 1;
    const bgClass = `challenge-bg-${Math.min(difficulty, 5)}`;
    const initialWrong = getWrongAnswerCount();
    const dailyMode = sessionStorage.getItem('quest:daily-mode') === '1';
    const inventory = getPowerUpInventory();

    container.innerHTML = `
        <div class="challenge-screen ${bgClass} ${theme.themeClass}">
            <div class="challenge-header">
                <button class="btn btn-small btn-ghost" id="back-btn">← Mapa</button>
                <div class="challenge-header-center">
                    <div class="challenge-progress" id="progress-dots"></div>
                    <div class="challenge-timer-row">
                        <span class="challenge-timer" id="challenge-timer">⏱️ 0s</span>
                        <div class="heart-strip" id="heart-strip" title="${STRINGS.hearts.tooltip}">
                            ${renderHeartStrip(initialWrong)}
                        </div>
                    </div>
                </div>
                <div class="mascot-stack" id="mascot-stack" title="Clique para motivação">
                    <div class="mascot-speech" id="mascot-speech" style="opacity:0;"></div>
                    <div class="mascot-island anim-float">${islandMascot}</div>
                    <div class="mascot-profile">${theme.sidekick}</div>
                </div>
            </div>
            ${dailyMode ? '<div class="daily-banner">🌟 Desafio do Dia — moedas em dobro!</div>' : ''}
            <div class="challenge-body" id="challenge-body"></div>
            <div class="challenge-footer">
                <div class="streak-badge" id="streak-badge" style="display:none;"></div>
                <div class="power-up-tray" id="power-up-tray">
                    ${inventory.bonusHint > 0 ? `<button class="power-up-btn" id="use-bonus-hint" title="Dica extra"><span class="pu-icon">💡</span><span class="pu-count">${inventory.bonusHint}</span></button>` : ''}
                    ${inventory.turbo > 0 ? `<button class="power-up-btn" id="use-turbo" title="Turbo: dobra o tempo para a estrela-relâmpago"><span class="pu-icon">⚡</span><span class="pu-count">${inventory.turbo}</span></button>` : ''}
                    ${inventory.skip > 0 ? `<button class="power-up-btn" id="use-skip" title="Pular desafio (1 estrela)"><span class="pu-icon">⏭️</span><span class="pu-count">${inventory.skip}</span></button>` : ''}
                </div>
            </div>
        </div>
    `;

    // Progress dots
    const dotsEl = container.querySelector('#progress-dots');
    data.challenges.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'challenge-dot';
        if (islandChallenges[i]?.completed) {
            dot.classList.add('challenge-dot-done');
        } else if (i === challengeIndex) {
            dot.classList.add('challenge-dot-current');
        }
        dotsEl.appendChild(dot);
    });

    // Combo flame
    renderCombo(container, state.stats.streakCurrent || 0);

    // Mascot tap - encouragement
    const mascotStack = container.querySelector('#mascot-stack');
    mascotStack.addEventListener('click', () => {
        mascotStack.classList.add('anim-bounce');
        sound.tap();
        showSpeech(container, pickCorrectPhrase(profile.id));
        setTimeout(() => mascotStack.classList.remove('anim-bounce'), 800);
    });

    const ChallengeClass = CHALLENGE_TYPES[challenge.type];
    if (!ChallengeClass) {
        container.querySelector('#challenge-body').innerHTML = `
            <div class="challenge-area" style="text-align:center;">
                <p>Tipo de desafio desconhecido: ${challenge.type}</p>
                <button class="btn btn-primary" id="skip-btn">Pular</button>
            </div>
        `;
        container.querySelector('#skip-btn').addEventListener('click', () => navigate('map/' + islandSlug));
        return;
    }

    const bodyEl = container.querySelector('#challenge-body');
    currentChallenge = new ChallengeClass(challenge, bodyEl);

    // Apply turbo bonus if the player activated it pre-challenge
    if (sessionStorage.getItem('quest:turbo-active') === '1') {
        currentChallenge.turboBonus = 2;
        sessionStorage.removeItem('quest:turbo-active');
    }

    currentChallenge.onComplete = (stars) => {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        mascotStack.classList.add('anim-bounce');
        showSpeech(container, pickCorrectPhrase(profile.id));

        const gotSpeed = currentChallenge.earnedSpeedStar();
        const flags = [];
        if (gotSpeed) flags.push('speed');
        if (dailyMode) flags.push('daily');

        let coinReward = stars * 5 + (stars === 3 ? 3 : 0);
        if (gotSpeed) coinReward += 3;
        if (dailyMode) coinReward *= 2;

        updateState(s => {
            const c = s.islands[islandSlug].challenges[challengeIndex];
            c.completed = true;
            c.stars = Math.max(c.stars, stars);
            c.attempts += currentChallenge.attempts;
            c.hintsUsed += currentChallenge.hintsUsed;
            s.stats.totalChallenges++;
            s.stats.totalCorrect++;
            s.stats.streakCurrent++;
            s.stats.streakBest = Math.max(s.stats.streakBest, s.stats.streakCurrent);
            s.stats.comboBest = Math.max(s.stats.comboBest || 0, s.stats.streakCurrent);
            if (gotSpeed) s.stats.speedStars = (s.stats.speedStars || 0) + 1;
            s.coins = (s.coins || 0) + coinReward;
        });

        if (dailyMode) {
            markDailyCompleted();
            sessionStorage.removeItem('quest:daily-mode');
        }

        const unlocked = checkAchievements();
        if (unlocked.length > 0) {
            sessionStorage.setItem('quest:just-unlocked', JSON.stringify(unlocked.map(a => a.id)));
        }

        // Increment session correct-answer counter (used for the every-5 milestone screen).
        const sessionCounter = (parseInt(sessionStorage.getItem('quest:correctStreakSession') || '0', 10) || 0) + 1;
        sessionStorage.setItem('quest:correctStreakSession', String(sessionCounter));

        const nextIdx = getNextAvailableChallenge(islandSlug);
        const islandComplete = nextIdx === -1;
        const isSpecial = islandComplete || gotSpeed || unlocked.length > 0 || dailyMode;

        if (isSpecial) {
            const flagPart = flags.length ? '/' + flags.join(',') : '';
            navigate(`results/${islandSlug}/${challengeIndex}/${stars}${flagPart}`);
        } else if (sessionCounter % 5 === 0) {
            navigate(`progress/${islandSlug}`);
        } else {
            navigate(`challenge/${islandSlug}/${nextIdx}`);
        }
    };

    // Wrong / correct event listeners
    wrongListener = (e) => {
        const { wrongCount, locked } = e.detail || {};
        updateHeartStrip(container, wrongCount || 0);
        showSpeech(container, pickWrongPhrase(profile.id));
        // Reset streak on wrong (breaks combo flame)
        updateState(s => { s.stats.streakCurrent = 0; });
        renderCombo(container, 0);

        // Solution reveal appears after 3 wrong attempts on THIS challenge
        if (currentChallenge && currentChallenge.attempts >= 3 && !container.querySelector('#reveal-solution-btn')) {
            const tray = container.querySelector('#power-up-tray');
            if (tray) {
                const btn = document.createElement('button');
                btn.id = 'reveal-solution-btn';
                btn.className = 'reveal-solution-btn';
                btn.innerHTML = '📖 Mostrar solução';
                btn.addEventListener('click', () => handleReveal(container));
                tray.appendChild(btn);
            }
        }

        if (locked) {
            sound.timeout && sound.timeout();
            setTimeout(() => navigate('lockout'), 600);
        }
    };
    correctListener = () => {
        updateHeartStrip(container, getWrongAnswerCount());
    };
    document.addEventListener('quest:wrong-answer', wrongListener);
    document.addEventListener('quest:correct-answer', correctListener);

    currentChallenge.render();
    sound.whoosh();
    startTimer(container);

    // Voice reader: auto-read the question + tap-to-repeat 🔊 button.
    // Ziva and Ava get voiced on every question; Ella only on questions that
    // contain real Portuguese words (her tier is mostly pure-emoji).
    const HAS_LETTER = /[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/;
    const profileWantsVoice = profile.id === 'ziva' || profile.id === 'ava' ||
        (profile.id === 'ella' && challenge.question && HAS_LETTER.test(challenge.question));
    if (profileWantsVoice && speech.isSupported() && challenge.question) {
        const speakOpts = { toddlerMode: profile.id === 'ella' || profile.id === 'ava' };
        const questionEl = bodyEl.querySelector('.challenge-question p');
        if (questionEl) {
            const speakBtn = document.createElement('button');
            speakBtn.type = 'button';
            speakBtn.className = 'speak-btn';
            speakBtn.setAttribute('aria-label', 'Ouvir de novo');
            speakBtn.textContent = '🔊';
            speakBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                speech.speakQuestion(challenge.question, speakOpts);
            });
            questionEl.appendChild(speakBtn);
        }
        speech.speakQuestion(challenge.question, speakOpts);
    }

    // Power-up: extra hint → reveal next hint even past maxHints
    const bonusHintBtn = container.querySelector('#use-bonus-hint');
    if (bonusHintBtn) {
        bonusHintBtn.addEventListener('click', () => {
            if (consumePowerUp('bonusHint')) {
                sound.coinCollect && sound.coinCollect();
                const lastHint = (challenge.hints || [])[(challenge.hints || []).length - 1] || '—';
                const body = container.querySelector('#challenge-body');
                const tip = document.createElement('div');
                tip.className = 'hint-area anim-fade-in';
                tip.innerHTML = `<span style="font-size:1.5rem;">🎁💡</span><span>${lastHint}</span>`;
                body.appendChild(tip);
                bonusHintBtn.remove();
            }
        });
    }

    // Power-up: turbo → double the speed threshold for this challenge
    const turboBtn = container.querySelector('#use-turbo');
    if (turboBtn) {
        turboBtn.addEventListener('click', () => {
            if (consumePowerUp('turbo') && currentChallenge) {
                currentChallenge.turboBonus = 2;
                sound.whoosh && sound.whoosh();
                turboBtn.classList.add('power-up-btn-active');
                turboBtn.disabled = true;
            }
        });
    }

    // Power-up: skip → complete with 1 star (no speed bonus)
    const skipBtn = container.querySelector('#use-skip');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            if (consumePowerUp('skip')) {
                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                updateState(s => {
                    const c = s.islands[islandSlug].challenges[challengeIndex];
                    c.completed = true;
                    c.stars = Math.max(c.stars || 0, 1);
                });
                navigate(`results/${islandSlug}/${challengeIndex}/1`);
            }
        });
    }

    container.querySelector('#back-btn').addEventListener('click', () => navigate('map/' + islandSlug));
}

function handleReveal(container) {
    if (!currentChallenge) return;
    const hints = currentChallenge.data.hints || [];
    const lastHint = hints[hints.length - 1] || 'Tente aos poucos — quebre o problema em passos menores.';
    const body = container.querySelector('#challenge-body');
    if (!body) return;
    const panel = document.createElement('div');
    panel.className = 'solution-panel anim-fade-in';
    panel.innerHTML = `
        <div class="solution-title">📖 Solução passo a passo</div>
        <ol class="solution-steps">${hints.map(h => `<li>${h}</li>`).join('')}</ol>
        <p class="solution-final">Resposta: <strong>${currentChallenge.data.correct}</strong></p>
        <p class="solution-final-note">${lastHint}</p>
    `;
    body.appendChild(panel);
    const revealBtn = container.querySelector('#reveal-solution-btn');
    if (revealBtn) revealBtn.remove();
}

export function exit() {
    speech.cancel();
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (currentChallenge) {
        currentChallenge.destroy();
        currentChallenge = null;
    }
    if (wrongListener) {
        document.removeEventListener('quest:wrong-answer', wrongListener);
        wrongListener = null;
    }
    if (correctListener) {
        document.removeEventListener('quest:correct-answer', correctListener);
        correctListener = null;
    }
    if (speechTimer) {
        clearTimeout(speechTimer);
        speechTimer = null;
    }
}
