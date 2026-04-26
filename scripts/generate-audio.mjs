#!/usr/bin/env node
// Pre-generate pt-BR question audio using ElevenLabs.
//
// Setup:
//   1. Put your API key in .env at the repo root:
//        ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
//   2. (Optional) Override voice / model:
//        ELEVENLABS_VOICE_NAME=Sarah          # default
//        ELEVENLABS_MODEL=eleven_multilingual_v2
//
// Run:
//   node scripts/generate-audio.mjs           # generate missing files only
//   node scripts/generate-audio.mjs --force   # regenerate everything
//   node scripts/generate-audio.mjs --list    # list available voices and exit
//
// Idempotent: skips questions whose mp3 already exists (unless --force).
// Output: audio/questions/<hash>.mp3 + audio/questions/manifest.json

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// Reuse the browser-side spoken-text transform so generator + runtime stay in sync.
const { toSpokenText } = await import(pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'utils', 'spoken-text.js')).href);
// Pull the phrase pools from the same i18n module the runtime reads.
const { STRINGS } = await import(pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'i18n.js')).href);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const OUT_DIR = join(ROOT, 'audio', 'questions');

// --- tiny .env loader (no dotenv dependency) ---
function loadEnv() {
    const envPath = join(ROOT, '.env');
    if (!existsSync(envPath)) return;
    const content = readFileSync(envPath, 'utf8');
    for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
    }
}
loadEnv();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_NAME = process.env.ELEVENLABS_VOICE_NAME || 'Sarah';
const MODEL_ID = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIST_ONLY = args.includes('--list');
const PHRASES_ONLY = args.includes('--phrases-only');

if (!API_KEY) {
    console.error('✗ ELEVENLABS_API_KEY missing. Add it to .env at repo root.');
    process.exit(1);
}

// --- hash matches the browser-side SHA-1 truncation ---
function hashQuestion(text) {
    return createHash('sha1').update(text.trim()).digest('hex').slice(0, 16);
}

// --- include all challenge tiers; we'll filter individual questions later ---
function listVoiceFiles() {
    return readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
}

// Toddler (Ella, age 4) and junior (Ava, age 5) tiers are "look and count" —
// speaking emoji counts would undercut the pedagogy. We only voice those
// questions whose original text contains actual Portuguese words, and run them
// through toddlerMode so emoji runs are dropped instead of read as numbers.
// Older tiers convert emoji runs into number words so emoji-math is audible.
const HAS_LETTER = /[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/;

function collectQuestions() {
    const seen = new Map(); // hash -> { text, spoken, sources: [], kind: 'question' }
    for (const file of listVoiceFiles()) {
        const data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
        const dropEmojiCounts = file.includes('-toddler') || file.includes('-junior');
        for (const [i, c] of (data.challenges || []).entries()) {
            const text = (c.question || '').trim();
            if (!text) continue;
            if (dropEmojiCounts && !HAS_LETTER.test(text)) continue;
            const spoken = toSpokenText(text, { toddlerMode: dropEmojiCounts });
            if (!spoken) continue;
            const h = hashQuestion(text);
            if (!seen.has(h)) seen.set(h, { text, spoken, sources: [], kind: 'question' });
            seen.get(h).sources.push(`${file}#${i}`);
        }
    }
    return seen;
}

// Every fixed UI string the app may speak between questions: mascot
// reactions, lockout encouragements, results headlines, progress headline,
// and the per-name progress lookup. Mirror the runtime call sites — if a
// string is missing here, the runtime will fall back to browser TTS and
// the player hears a non-Amanda voice.
function collectPhrases() {
    const seen = new Map(); // hash -> { text, spoken, sources: [], kind: 'phrase' }
    const add = (text, source) => {
        const t = (text || '').toString().trim();
        if (!t) return;
        // Phrases are short stand-alone strings — never look-and-count
        // pedagogy — so toddlerMode stays false here. The transform is
        // mostly a no-op for these.
        const spoken = toSpokenText(t, { toddlerMode: false });
        if (!spoken) return;
        const h = hashQuestion(t);
        if (!seen.has(h)) seen.set(h, { text: t, spoken, sources: [], kind: 'phrase' });
        seen.get(h).sources.push(source);
    };

    for (const profileId of ['ziva', 'ava', 'ella']) {
        const theme = STRINGS.themes?.[profileId];
        if (!theme) continue;
        for (const p of theme.correctPhrases || []) add(p, `themes.${profileId}.correctPhrases`);
        for (const p of theme.wrongPhrases   || []) add(p, `themes.${profileId}.wrongPhrases`);
    }

    add(STRINGS.mascot?.genericWrong, 'mascot.genericWrong');

    for (const p of STRINGS.lockout?.encouragements || []) add(p, 'lockout.encouragements');

    for (const [profileId, msg] of Object.entries(STRINGS.results3starByProfile || {})) {
        add(msg, `results3starByProfile.${profileId}`);
    }
    for (const [stars, msg] of Object.entries(STRINGS.resultsByStars || {})) {
        add(msg, `resultsByStars.${stars}`);
    }
    for (const [name, msg] of Object.entries(STRINGS.progressHeadlineByName || {})) {
        add(msg, `progressHeadlineByName.${name}`);
    }

    return seen;
}

// --- ElevenLabs API ---
async function fetchVoices() {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': API_KEY }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET /v1/voices failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json.voices || [];
}

function findVoice(voices, name) {
    const lower = name.toLowerCase();
    return voices.find(v => (v.name || '').toLowerCase() === lower)
        || voices.find(v => (v.name || '').toLowerCase().includes(lower));
}

async function synthesize(voiceId, text) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    const body = {
        text,
        model_id: MODEL_ID,
        language_code: 'pt',
        voice_settings: {
            stability: 0.40,
            similarity_boost: 0.80,
            style: 0.35,
            use_speaker_boost: true
        }
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`TTS failed (${res.status}): ${errText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
}

// --- main ---
async function main() {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    const voices = await fetchVoices();

    if (LIST_ONLY) {
        console.log(`Available voices (${voices.length}):`);
        for (const v of voices) {
            const labels = v.labels || {};
            const desc = [labels.gender, labels.accent, labels.description].filter(Boolean).join(', ');
            console.log(`  ${v.name.padEnd(20)} ${v.voice_id}   ${desc}`);
        }
        return;
    }

    const voice = findVoice(voices, VOICE_NAME);
    if (!voice) {
        console.error(`✗ Voice "${VOICE_NAME}" not found in your account.`);
        console.error(`  Run with --list to see available voices.`);
        console.error(`  Or set ELEVENLABS_VOICE_NAME in .env to one you have.`);
        process.exit(1);
    }
    console.log(`✓ Voice: ${voice.name} (${voice.voice_id})  Model: ${MODEL_ID}`);

    const phrases = collectPhrases();
    const questions = PHRASES_ONLY ? new Map() : collectQuestions();
    if (PHRASES_ONLY) {
        console.log(`✓ Phrases-only mode — skipping question pool`);
    }
    console.log(`✓ Found ${questions.size} unique question(s) and ${phrases.size} unique phrase(s)`);

    // Merge phrases into the same map keyed by hash. If a phrase ever
    // collides with a question hash (extremely unlikely with SHA-1) the
    // question wins for source tracking — they share the same mp3 anyway.
    const all = new Map(questions);
    for (const [h, entry] of phrases) {
        if (all.has(h)) {
            const existing = all.get(h);
            existing.sources = [...existing.sources, ...entry.sources];
            continue;
        }
        all.set(h, entry);
    }

    // Existing manifest lets us detect which mp3s were generated from a stale
    // spoken form (e.g. before this transform existed) and only regenerate those.
    const manifestPath = join(OUT_DIR, 'manifest.json');
    const oldManifest = existsSync(manifestPath)
        ? JSON.parse(readFileSync(manifestPath, 'utf8'))
        : {};

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const manifest = {};
    // Preserve manifest entries we didn't regenerate this run (e.g. when
    // running --phrases-only) so the file stays a complete index.
    if (PHRASES_ONLY) {
        for (const [h, entry] of Object.entries(oldManifest)) {
            // Default kind 'question' for backward compatibility with old
            // manifests that don't carry the field.
            manifest[h] = { kind: 'question', ...entry };
        }
    }
    for (const [hash, { text, spoken, sources, kind }] of all) {
        manifest[hash] = { text, spoken, sources, kind: kind || 'question' };
        const outPath = join(OUT_DIR, `${hash}.mp3`);
        const prev = oldManifest[hash];
        const stale = !prev || prev.spoken !== spoken;
        if (!FORCE && !stale && existsSync(outPath)) {
            skipped++;
            continue;
        }
        const why = stale && existsSync(outPath) ? '↻' : '+';
        const tag = (kind || 'question').slice(0, 1).toUpperCase();
        process.stdout.write(`  ${why} [${tag}] ${hash}  ${spoken.slice(0, 60).replace(/\n/g, ' ')}${spoken.length > 60 ? '…' : ''}\n`);
        try {
            const mp3 = await synthesize(voice.voice_id, spoken);
            writeFileSync(outPath, mp3);
            generated++;
        } catch (e) {
            console.error(`  ✗ ${hash}: ${e.message}`);
            failed++;
        }
        // Be polite — small gap between requests
        await new Promise(r => setTimeout(r, 150));
    }

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`\nDone. generated=${generated}  skipped=${skipped}  failed=${failed}  total=${all.size}`);
    if (failed > 0) process.exit(1);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
