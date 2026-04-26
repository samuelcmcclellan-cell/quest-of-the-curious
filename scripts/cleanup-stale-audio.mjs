#!/usr/bin/env node
// One-shot cleanup: delete mp3s whose `spoken` field no longer matches what
// the current spoken-text + generator logic would produce. The next run of
// generate-audio.mjs will regenerate them; until then, the runtime falls back
// to SpeechSynthesis (which already uses the up-to-date toSpokenText).

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const { toSpokenText } = await import(pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'utils', 'spoken-text.js')).href);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'audio', 'questions');
const MANIFEST = join(OUT_DIR, 'manifest.json');

if (!existsSync(MANIFEST)) {
    console.log('No manifest, nothing to clean.');
    process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

let deleted = 0;
let kept = 0;
for (const [hash, entry] of Object.entries(manifest)) {
    const sources = entry.sources || [];
    const dropEmojiCounts = sources.some(s => s.includes('-toddler') || s.includes('-junior'));
    const newSpoken = toSpokenText(entry.text || '', { toddlerMode: dropEmojiCounts });
    if (!newSpoken || newSpoken === entry.spoken) {
        kept++;
        continue;
    }
    const mp3 = join(OUT_DIR, `${hash}.mp3`);
    if (existsSync(mp3)) {
        unlinkSync(mp3);
        deleted++;
        console.log(`✗ ${hash}  was: "${entry.spoken}"  now: "${newSpoken}"`);
    }
    entry.spoken = newSpoken;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\nDone. deleted=${deleted}  kept=${kept}`);
