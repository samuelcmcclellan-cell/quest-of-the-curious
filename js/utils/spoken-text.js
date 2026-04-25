// Convert visual question text into a pt-BR spoken form so a TTS voice
// (ElevenLabs or browser SpeechSynthesis) actually says something audible.
//
// Rules:
//   • Runs of identical/joined emojis are replaced by their count in
//     Portuguese ("🌊🌊🌊" → "três").
//   • A solitary emoji at the start of a non-math sentence is treated as
//     decoration and dropped ("🍪 Metade?" → "Metade?"). Inside a math
//     expression a single emoji means "um".
//   • Math symbols are read aloud (+ → "mais", - → "menos", × → "vezes",
//     ÷ → "dividido", = → "igual").
//   • Multiple spaces collapse, edges trim.
//
// Toddler mode (`{ toddlerMode: true }`) drops every emoji instead of
// counting them, so prompts like "Conta! 🦕🦕🦕" don't say "Conta! três"
// and reveal the answer. The toddler tier is a "look and count" pedagogy.
//
// Returns '' when the spoken form has no readable letters (e.g. emoji-only
// counting prompts for the toddler tier) — callers can use that to skip
// voice entirely.

const NUMBER_WORDS_PT = [
    'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito',
    'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis',
    'dezessete', 'dezoito', 'dezenove', 'vinte'
];

const HAS_MATH = /[+\-×÷=]/;
const HAS_LETTER = /[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/;

// Match a run of one or more pictographic clusters (handles ZWJ + VS-16).
const EMOJI_RUN = /(?:\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic})*\uFE0F?)+/gu;

function countGraphemes(run) {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        const seg = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });
        return [...seg.segment(run)].length;
    }
    // Fallback: count base pictographic codepoints (ZWJ-joined still counts as
    // 1 because we count Extended_Pictographic only between joiners — close enough).
    const m = run.match(/\p{Extended_Pictographic}/gu);
    return m ? m.length : 0;
}

function numberWord(n) {
    if (n >= 0 && n < NUMBER_WORDS_PT.length) return NUMBER_WORDS_PT[n];
    return String(n);
}

const OP_MAP = {
    '+': ' mais ',
    '-': ' menos ',
    '×': ' vezes ',
    '÷': ' dividido por ',
    '=': ' igual '
};

export function toSpokenText(text, { toddlerMode = false } = {}) {
    if (!text) return '';
    const isMathy = HAS_MATH.test(text);

    // 1) Replace emoji runs with counts (or drop solitary decoration emoji).
    //    In toddler mode every emoji is dropped so we never speak the answer.
    let out = text.replace(EMOJI_RUN, (run) => {
        if (toddlerMode) return ' ';
        const count = countGraphemes(run);
        if (count === 0) return ' ';
        if (count === 1) {
            // Decoration vs "one of something" — only a math context calls
            // for "um"; otherwise drop it (e.g. "🍪 Metade?" → "Metade?").
            return isMathy ? ' um ' : ' ';
        }
        return ' ' + numberWord(count) + ' ';
    });

    // 2) Read math operators aloud — only when whitespace-bounded so we don't
    //    mangle compound words like "estrela-do-mar" or "Gato-Rei".
    out = out.replace(/(^|\s)([+\-×÷=])(\s|$)/g, (_, l, op, r) => l + OP_MAP[op].trim() + r);

    // 3) Collapse whitespace.
    out = out.replace(/\s+/g, ' ').trim();

    // 4) Empty-out questions that ended up with no readable words (so the
    //    caller can skip voice entirely instead of speaking "?" alone).
    if (!HAS_LETTER.test(out)) return '';

    return out;
}
