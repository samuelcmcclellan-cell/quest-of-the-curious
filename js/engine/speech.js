// Speech wrapper: prefers a pre-generated ElevenLabs mp3 keyed by SHA-1(text);
// falls back to the browser's SpeechSynthesis voice when no clip is available.

import { toSpokenText } from '../utils/spoken-text.js';

const AUDIO_BASE = './audio/questions';
let preferredVoice = null;
let voicesReady = false;
let currentAudio = null;
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

export function speak(text, opts = {}) {
    cancel();
    speakViaSynthesis((text || '').toString(), opts);
}

// Preferred entry point for question text. Tries the pre-generated mp3 first
// and falls back to SpeechSynthesis if it isn't there.
export async function speakQuestion(text, opts = {}) {
    cancel();
    const cleaned = (text || '').toString().trim();
    if (!cleaned) return;

    let hash;
    try {
        hash = await hashQuestion(cleaned);
    } catch (_) {
        speakViaSynthesis(cleaned, opts);
        return;
    }

    if (missingAudio.has(hash)) {
        speakViaSynthesis(cleaned, opts);
        return;
    }

    const url = `${AUDIO_BASE}/${hash}.mp3`;
    const audio = new Audio(url);
    audio.preload = 'auto';
    currentAudio = audio;

    audio.addEventListener('error', () => {
        missingAudio.add(hash);
        if (currentAudio === audio) currentAudio = null;
        speakViaSynthesis(cleaned, opts);
    }, { once: true });

    try {
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                missingAudio.add(hash);
                if (currentAudio === audio) currentAudio = null;
                speakViaSynthesis(cleaned, opts);
            });
        }
    } catch (_) {
        missingAudio.add(hash);
        currentAudio = null;
        speakViaSynthesis(cleaned, opts);
    }
}

export function cancel() {
    stopCurrentAudio();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}
