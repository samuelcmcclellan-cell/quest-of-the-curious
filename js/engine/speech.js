// Speech wrapper: prefers a pre-generated ElevenLabs (Amanda Kelly) mp3
// keyed by SHA-1(text); falls back to the browser's SpeechSynthesis voice
// only when no clip is available — that fallback path is a safety net, not
// a normal flow. Any string passed to speakPhrase() must also appear in
// scripts/generate-audio.mjs's collectPhrases() so the mp3 exists.

import { toSpokenText } from '../utils/spoken-text.js';

const AUDIO_BASE = './audio/questions';
let preferredVoice = null;
let voicesReady = false;
let currentAudio = null;
// Bumped on every cancel() and at the top of every speakPrerendered() call.
// Lets in-flight async work detect that it has been superseded and bail out
// before creating an Audio element that would overlap with a newer call.
let speechGeneration = 0;
const missingAudio = new Set();

function pickVoice(lang) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;
    const target = (lang || 'pt-BR').toLowerCase();
    const exact = voices.find(v => (v.lang || '').toLowerCase() === target);
    if (exact) return exact;
    const prefix = target.split('-')[0];
    const partial = voices.find(v => (v.lang || '').toLowerCase().startsWith(prefix));
    return partial || null;
}

function ensureVoicesLoaded(lang) {
    if (voicesReady) return;
    preferredVoice = pickVoice(lang);
    if (preferredVoice) {
        voicesReady = true;
        return;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis && 'onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            preferredVoice = pickVoice(lang);
            voicesReady = true;
        }, { once: true });
    }
}

// SHA-1 hex truncated to 16 chars — must match scripts/generate-audio.mjs
async function hashQuestion(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
}

function stopCurrentAudio() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch (_) { /* ignore */ }
        currentAudio = null;
    }
}

function speakViaSynthesis(text, opts) {
    // The browser TTS will read raw emoji as silence too — feed it the
    // spoken form so the fallback path is also audible.
    const cleaned = toSpokenText(text, { toddlerMode: !!opts.toddlerMode }) || text.trim();
    if (!cleaned) return;
    const lang = opts.lang || 'pt-BR';
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    ensureVoicesLoaded(lang);
    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.lang = lang;
    utter.rate = opts.rate ?? 0.95;
    utter.pitch = opts.pitch ?? 1.05;
    const voice = preferredVoice || pickVoice(lang);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
}

export function isSupported() {
    return typeof window !== 'undefined'
        && (typeof window.speechSynthesis !== 'undefined' || typeof window.Audio !== 'undefined');
}

// Legacy direct-to-browser-TTS path. Avoid using this — prefer speakPhrase
// or speakQuestion so the player hears Amanda Kelly. Kept only for cases
// where pre-generation is genuinely impossible.
export function speak(text, opts = {}) {
    cancel();
    speakViaSynthesis((text || '').toString(), opts);
}

// Generic "play a pre-rendered Amanda Kelly mp3 for this exact text, fall
// back to browser TTS if the file is missing" implementation. Both
// speakQuestion and speakPhrase delegate here.
async function speakPrerendered(text, opts = {}) {
    cancel();
    const myGen = ++speechGeneration;
    const cleaned = (text || '').toString().trim();
    if (!cleaned) return;

    let hash;
    try {
        hash = await hashQuestion(cleaned);
    } catch (_) {
        if (myGen !== speechGeneration) return;
        speakViaSynthesis(cleaned, opts);
        return;
    }

    if (myGen !== speechGeneration) return;

    if (missingAudio.has(hash)) {
        speakViaSynthesis(cleaned, opts);
        return;
    }

    const url = `${AUDIO_BASE}/${hash}.mp3`;
    const audio = new Audio(url);
    audio.preload = 'auto';
    currentAudio = audio;

    audio.addEventListener('error', () => {
        if (myGen !== speechGeneration) return;
        if (!missingAudio.has(hash)) {
            // Warn once per hash so we can spot drift between runtime
            // strings and the generator's phrase pool.
            console.warn(
                `[speech] Missing pre-rendered audio for "${cleaned.slice(0, 80)}${cleaned.length > 80 ? '…' : ''}" (hash ${hash}). ` +
                `Add the string to collectPhrases() in scripts/generate-audio.mjs and re-run the generator.`
            );
            missingAudio.add(hash);
        }
        if (currentAudio === audio) currentAudio = null;
        speakViaSynthesis(cleaned, opts);
    }, { once: true });

    try {
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // A deliberate cancel() (e.g. screen navigation superseded
                // this call) rejects the play promise with AbortError —
                // don't fire the synthesis fallback or mark the file as
                // missing in that case.
                if (myGen !== speechGeneration) return;
                missingAudio.add(hash);
                if (currentAudio === audio) currentAudio = null;
                speakViaSynthesis(cleaned, opts);
            });
        }
    } catch (_) {
        if (myGen !== speechGeneration) return;
        missingAudio.add(hash);
        currentAudio = null;
        speakViaSynthesis(cleaned, opts);
    }
}

// Preferred entry point for question text. Tries the pre-generated mp3
// first and falls back to SpeechSynthesis if it isn't there.
export function speakQuestion(text, opts = {}) {
    return speakPrerendered(text, opts);
}

// Preferred entry point for fixed UI phrases (mascot reactions, lockout
// encouragements, results headlines, etc). The string MUST also be present
// in scripts/generate-audio.mjs#collectPhrases() — otherwise it'll fall
// through to browser TTS and a console.warn will fire.
export function speakPhrase(text, opts = {}) {
    return speakPrerendered(text, opts);
}

export function cancel() {
    // Bump first so any in-flight speakPrerendered() resuming from `await`
    // immediately sees that its captured generation is stale and bails.
    speechGeneration++;
    stopCurrentAudio();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}
