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
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

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

if (!API_KEY) {
    console.error('✗ ELEVENLABS_API_KEY missing. Add it to .env at repo root.');
    process.exit(1);
}

// --- hash matches the browser-side SHA-1 truncation ---
function hashQuestion(text) {
    return createHash('sha1').update(text.trim()).digest('hex').slice(0, 16);
}

// --- pick Ziva-tier files only (no -junior / -toddler suffix) ---
function listZivaFiles() {
    return readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json'))
        .filter(f => !f.includes('-junior') && !f.includes('-toddler'));
}

function collectQuestions() {
    const seen = new Map(); // hash -> { text, sources: [] }
    for (const file of listZivaFiles()) {
        const data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
        for (const [i, c] of (data.challenges || []).entries()) {
            const text = (c.question || '').trim();
            if (!text) continue;
            const h = hashQuestion(text);
            if (!seen.has(h)) seen.set(h, { text, sources: [] });
            seen.get(h).sources.push(`${file}#${i}`);
        }
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
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
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

    const questions = collectQuestions();
    console.log(`✓ Found ${questions.size} unique questions across Ziva-tier files`);

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const manifest = {};
    for (const [hash, { text, sources }] of questions) {
        manifest[hash] = { text, sources };
        const outPath = join(OUT_DIR, `${hash}.mp3`);
        if (!FORCE && existsSync(outPath)) {
            skipped++;
            continue;
        }
        process.stdout.write(`  → ${hash}  ${text.slice(0, 60).replace(/\n/g, ' ')}${text.length > 60 ? '…' : ''}\n`);
        try {
            const mp3 = await synthesize(voice.voice_id, text);
            writeFileSync(outPath, mp3);
            generated++;
        } catch (e) {
            console.error(`  ✗ ${hash}: ${e.message}`);
            failed++;
        }
        // Be polite — small gap between requests
        await new Promise(r => setTimeout(r, 150));
    }

    writeFileSync(
        join(OUT_DIR, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    console.log(`\nDone. generated=${generated}  skipped=${skipped}  failed=${failed}  total=${questions.size}`);
    if (failed > 0) process.exit(1);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
