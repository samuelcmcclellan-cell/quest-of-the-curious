import { randomInt, shuffle } from './shuffle.js';

const ILLUSTRATIONS = ['🐠', '🐙', '🦀', '🐬', '🐋', '🐚', '🦑', '🏝️', '⛵', '🧮'];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateWrongAnswers(correct, count = 3) {
    const wrongs = new Set();
    const spread = Math.max(5, Math.abs(correct) * 0.3);
    while (wrongs.size < count) {
        let wrong = correct + randomInt(-Math.ceil(spread), Math.ceil(spread));
        if (wrong !== correct && wrong >= 0) {
            wrongs.add(wrong);
        }
    }
    return [...wrongs];
}

function makeMultipleChoice(question, correct, illustration, hints) {
    const wrongs = generateWrongAnswers(correct);
    return {
        type: 'multiple-choice',
        question,
        illustration: illustration || pick(ILLUSTRATIONS),
        options: shuffle([correct, ...wrongs]),
        correct,
        hints,
    };
}

// Level 1: Single-digit multiplication, basic addition
function level1() {
    const type = randomInt(0, 2);

    if (type === 0) {
        const a = randomInt(2, 9);
        const b = randomInt(2, 9);
        const answer = a * b;
        return makeMultipleChoice(
            `What is ${a} × ${b}?`,
            answer,
            '🧮',
            [`Think about ${a} groups of ${b}.`, `Count by ${b}s: ${Array.from({length: a}, (_, i) => b * (i + 1)).join(', ')}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        const a = randomInt(10, 99);
        const b = randomInt(10, 99);
        const answer = a + b;
        return makeMultipleChoice(
            `What is ${a} + ${b}?`,
            answer,
            '🐠',
            ['Add the ones place first, then the tens.', `${a % 10} + ${b % 10} = ${a % 10 + b % 10}`, `${a} + ${b} = ${answer}`]
        );
    } else {
        const a = randomInt(20, 99);
        const b = randomInt(5, a - 1);
        const answer = a - b;
        return makeMultipleChoice(
            `What is ${a} - ${b}?`,
            answer,
            '🐚',
            ['Subtract the ones place first, then the tens.', `You can count up from ${b} to ${a}.`, `${a} - ${b} = ${answer}`]
        );
    }
}

// Level 2: 2-digit × 1-digit, simple division
function level2() {
    const type = randomInt(0, 2);

    if (type === 0) {
        const a = randomInt(11, 25);
        const b = randomInt(2, 6);
        const answer = a * b;
        return makeMultipleChoice(
            `What is ${a} × ${b}?`,
            answer,
            '🐬',
            [`Break it apart: (${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b})`, `${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}, ${a % 10} × ${b} = ${a % 10 * b}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        const b = randomInt(2, 9);
        const answer = randomInt(3, 12);
        const a = b * answer;
        return makeMultipleChoice(
            `What is ${a} ÷ ${b}?`,
            answer,
            '🐙',
            [`Think: what number times ${b} equals ${a}?`, `${b} × ? = ${a}`, `${a} ÷ ${b} = ${answer}`]
        );
    } else {
        const a = randomInt(100, 500);
        const b = randomInt(100, 500);
        const answer = a + b;
        return {
            type: 'number-builder',
            question: `Drag the digits to build the answer: ${a} + ${b} = ?`,
            illustration: '🧮',
            correct: answer,
            hints: [`Add ones first: ${a % 10} + ${b % 10}`, `Then add tens, then hundreds. Don't forget to carry!`, `${a} + ${b} = ${answer}`],
        };
    }
}

// Level 3: Multi-digit multiplication, division with remainders
function level3() {
    const type = randomInt(0, 2);

    if (type === 0) {
        const a = randomInt(12, 50);
        const b = randomInt(3, 9);
        const answer = a * b;
        return makeMultipleChoice(
            `What is ${a} × ${b}?`,
            answer,
            '🦀',
            [`Break ${a} into ${Math.floor(a / 10) * 10} + ${a % 10}, then multiply each part.`, `(${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b}) = ${Math.floor(a / 10) * 10 * b} + ${a % 10 * b}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        const items = ['fish', 'shells', 'starfish', 'pearls', 'coins'];
        const item = pick(items);
        const groups = randomInt(3, 8);
        const perGroup = randomInt(5, 15);
        const total = groups * perGroup;
        return makeMultipleChoice(
            `If you split ${total} ${item} equally into ${groups} groups, how many are in each group?`,
            perGroup,
            '🐟',
            [`Divide ${total} by ${groups}.`, `${groups} × ? = ${total}`, `${total} ÷ ${groups} = ${perGroup}`]
        );
    } else {
        // Sequence pattern
        const start = randomInt(2, 10);
        const step = randomInt(3, 8);
        const seq = Array.from({ length: 5 }, (_, i) => start + step * i);
        const answer = start + step * 5;
        return {
            type: 'sequence-next',
            question: 'Find the pattern! What comes next?',
            illustration: '🔢',
            sequence: [...seq, '?'],
            options: shuffle([answer, answer + step, answer - 1, answer + randomInt(1, 3)]).slice(0, 4),
            correct: answer,
            hints: [`Look at the difference between each number.`, `Each number increases by ${step}.`, `${seq[4]} + ${step} = ${answer}`],
        };
    }
}

// Level 4: Two-step word problems, area/perimeter
function level4() {
    const type = randomInt(0, 2);

    if (type === 0) {
        const l = randomInt(5, 20);
        const w = randomInt(3, 15);
        const perimeter = 2 * (l + w);
        return makeMultipleChoice(
            `A rectangular pool is ${l} meters long and ${w} meters wide. What is its perimeter?`,
            perimeter,
            '🏊',
            ['Perimeter = 2 × (length + width)', `2 × (${l} + ${w}) = 2 × ${l + w}`, `Perimeter = ${perimeter} meters`]
        );
    } else if (type === 1) {
        const l = randomInt(4, 12);
        const w = randomInt(3, 10);
        const area = l * w;
        return makeMultipleChoice(
            `A garden is ${l} meters long and ${w} meters wide. What is its area?`,
            area,
            '🌱',
            ['Area = length × width', `${l} × ${w} = ?`, `Area = ${area} square meters`]
        );
    } else {
        const earned = randomInt(20, 100);
        const spent = randomInt(5, Math.floor(earned / 2));
        const found = randomInt(5, 30);
        const answer = earned - spent + found;
        return makeMultipleChoice(
            `You earned ${earned} coins, spent ${spent} coins, then found ${found} more. How many coins do you have?`,
            answer,
            '💰',
            ['Do it step by step: earn, spend, then find.', `${earned} - ${spent} = ${earned - spent}. Then + ${found}.`, `${earned} - ${spent} + ${found} = ${answer}`]
        );
    }
}

// Level 5: Multi-step, order of operations
function level5() {
    const type = randomInt(0, 1);

    if (type === 0) {
        const a = randomInt(3, 8);
        const b = randomInt(3, 8);
        const c = randomInt(5, 20);
        const answer = a * b + c;
        return makeMultipleChoice(
            `What is ${a} × ${b} + ${c}?`,
            answer,
            '🧠',
            ['Remember: multiply first, then add!', `${a} × ${b} = ${a * b}. Then + ${c}.`, `${a * b} + ${c} = ${answer}`]
        );
    } else {
        const factor = randomInt(2, 5);
        const seq = Array.from({ length: 5 }, (_, i) => factor ** (i + 1));
        const answer = factor ** 6;
        return {
            type: 'sequence-next',
            question: 'This pattern multiplies each time. What comes next?',
            illustration: '🚀',
            sequence: [...seq, '?'],
            options: shuffle([answer, answer + factor, answer * 2, answer - factor]).slice(0, 4),
            correct: answer,
            hints: [`Each number is multiplied by ${factor}.`, `${seq[3]} × ${factor} = ${seq[4]}, so ${seq[4]} × ${factor} = ?`, `${seq[4]} × ${factor} = ${answer}`],
        };
    }
}

const GENERATORS = [level1, level2, level3, level4, level5];

export function generateChallenge(difficulty) {
    const level = Math.max(1, Math.min(5, difficulty));
    return GENERATORS[level - 1]();
}
