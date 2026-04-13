import { randomInt, shuffle } from './shuffle.js';

const ILLUSTRATIONS = ['🐠', '🐙', '🦀', '🐬', '🐋', '🐚', '🦑', '🏝️', '⛵', '⭐'];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateWrongAnswers(correct, count = 3) {
    const wrongs = new Set();
    const spread = Math.max(3, Math.abs(correct) * 0.3);
    let attempts = 0;
    while (wrongs.size < count && attempts < 50) {
        attempts++;
        let wrong = correct + randomInt(-Math.ceil(spread), Math.ceil(spread));
        if (wrong !== correct && wrong >= 0) {
            wrongs.add(wrong);
        }
    }
    // Fallback if not enough wrongs generated
    while (wrongs.size < count) {
        wrongs.add(correct + wrongs.size + 1);
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

// Level 1: Single-digit addition/subtraction, counting multiplication (2-5 × 1-5)
function level1() {
    const type = randomInt(0, 2);

    if (type === 0) {
        // Single-digit addition
        const a = randomInt(1, 9);
        const b = randomInt(1, 9);
        const answer = a + b;
        const stories = [
            `You found ${a} shells and then ${b} more! How many shells?`,
            `${a} fish are swimming, and ${b} more join them. How many fish now?`,
            `You have ${a} coins and find ${b} more. How many coins total?`,
        ];
        return makeMultipleChoice(
            pick(stories), answer, pick(['🐚', '🐠', '💰']),
            [`Count them together: ${a} plus ${b} more.`, `Start at ${a} and count up ${b}: ${Array.from({length: b}, (_, i) => a + i + 1).join(', ')}.`, `${a} + ${b} = ${answer}`]
        );
    } else if (type === 1) {
        // Single-digit subtraction (result >= 0)
        const a = randomInt(3, 9);
        const b = randomInt(1, a);
        const answer = a - b;
        const stories = [
            `You had ${a} seashells but gave away ${b}. How many are left?`,
            `${a} birds were sitting on a rock. ${b} flew away. How many are left?`,
        ];
        return makeMultipleChoice(
            pick(stories), answer, pick(['🐚', '🐦']),
            [`Start with ${a} and take away ${b}.`, `Count back ${b} from ${a}.`, `${a} - ${b} = ${answer}`]
        );
    } else {
        // Counting multiplication (2-5 × 1-5)
        const a = randomInt(2, 5);
        const b = randomInt(1, 5);
        const answer = a * b;
        const stories = [
            `There are ${a} groups of ${b} shells. How many shells total?`,
            `${a} fish each have ${b} stripes. How many stripes in all?`,
        ];
        return makeMultipleChoice(
            pick(stories), answer, pick(['🐚', '🐠']),
            [`You have ${a} groups of ${b}.`, `Count by ${b}s: ${Array.from({length: a}, (_, i) => b * (i + 1)).join(', ')}.`, `${a} × ${b} = ${answer}`]
        );
    }
}

// Level 2: Single-digit multiplication (up to 9×9), 2-digit addition/subtraction
function level2() {
    const type = randomInt(0, 2);

    if (type === 0) {
        // Times tables up to 9×9
        const a = randomInt(2, 9);
        const b = randomInt(2, 9);
        const answer = a * b;
        return makeMultipleChoice(
            `What is ${a} × ${b}?`, answer, '🧮',
            [`Think about ${a} groups of ${b}.`, `Count by ${b}s: ${Array.from({length: a}, (_, i) => b * (i + 1)).join(', ')}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        // 2-digit addition (friendly numbers)
        const a = randomInt(10, 50);
        const b = randomInt(10, 50);
        const answer = a + b;
        return makeMultipleChoice(
            `What is ${a} + ${b}?`, answer, '🐠',
            ['Add the ones place first, then the tens.', `${a % 10} + ${b % 10} = ${a % 10 + b % 10}`, `${a} + ${b} = ${answer}`]
        );
    } else {
        // 2-digit subtraction
        const a = randomInt(20, 60);
        const b = randomInt(5, a - 5);
        const answer = a - b;
        return makeMultipleChoice(
            `What is ${a} - ${b}?`, answer, '🐚',
            ['Subtract the ones first, then the tens.', `You can count up from ${b} to ${a}.`, `${a} - ${b} = ${answer}`]
        );
    }
}

// Level 3: 2-digit × 1-digit, simple division, number builder
function level3() {
    const type = randomInt(0, 2);

    if (type === 0) {
        const a = randomInt(11, 20);
        const b = randomInt(2, 5);
        const answer = a * b;
        return makeMultipleChoice(
            `What is ${a} × ${b}?`, answer, '🐬',
            [`Break it apart: (${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b})`, `${Math.floor(a / 10) * 10 * b} + ${a % 10 * b}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        // Simple division
        const b = randomInt(2, 6);
        const answer = randomInt(2, 10);
        const a = b * answer;
        return makeMultipleChoice(
            `What is ${a} ÷ ${b}?`, answer, '🐙',
            [`Think: what number times ${b} equals ${a}?`, `${b} × ? = ${a}`, `${a} ÷ ${b} = ${answer}`]
        );
    } else {
        // Number builder with 2-digit + 2-digit
        const a = randomInt(20, 60);
        const b = randomInt(20, 60);
        const answer = a + b;
        return {
            type: 'number-builder',
            question: `Build the answer: ${a} + ${b} = ?`,
            illustration: '🧮',
            correct: answer,
            hints: [`Add ones first: ${a % 10} + ${b % 10}`, `Then add tens. Don't forget to carry!`, `${a} + ${b} = ${answer}`],
        };
    }
}

// Level 4: Multi-digit multiplication, word problems, sequences
function level4() {
    const type = randomInt(0, 2);

    if (type === 0) {
        const a = randomInt(12, 30);
        const b = randomInt(3, 9);
        const answer = a * b;
        return makeMultipleChoice(
            `What is ${a} × ${b}?`, answer, '🦀',
            [`Break ${a} into ${Math.floor(a / 10) * 10} + ${a % 10}, then multiply each.`, `(${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b})`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        const items = ['fish', 'shells', 'starfish', 'pearls', 'coins'];
        const item = pick(items);
        const groups = randomInt(3, 6);
        const perGroup = randomInt(4, 10);
        const total = groups * perGroup;
        return makeMultipleChoice(
            `If you split ${total} ${item} equally into ${groups} groups, how many in each group?`,
            perGroup, '🐟',
            [`Divide ${total} by ${groups}.`, `${groups} × ? = ${total}`, `${total} ÷ ${groups} = ${perGroup}`]
        );
    } else {
        const start = randomInt(2, 8);
        const step = randomInt(3, 6);
        const seq = Array.from({ length: 5 }, (_, i) => start + step * i);
        const answer = start + step * 5;
        return {
            type: 'sequence-next',
            question: 'Find the pattern! What comes next?',
            illustration: '🔢',
            sequence: [...seq, '?'],
            options: shuffle([answer, answer + step, answer - 1, answer + randomInt(1, 3)]).slice(0, 4),
            correct: answer,
            hints: [`Look at the difference between numbers.`, `Each number increases by ${step}.`, `${seq[4]} + ${step} = ${answer}`],
        };
    }
}

// Level 5: Two-step problems, area/perimeter, order of operations, doubling sequences
function level5() {
    const type = randomInt(0, 3);

    if (type === 0) {
        const l = randomInt(5, 15);
        const w = randomInt(3, 10);
        const perimeter = 2 * (l + w);
        return makeMultipleChoice(
            `A rectangular pool is ${l}m long and ${w}m wide. What is its perimeter?`,
            perimeter, '🏊',
            ['Perimeter = 2 × (length + width)', `2 × (${l} + ${w}) = 2 × ${l + w}`, `Perimeter = ${perimeter} meters`]
        );
    } else if (type === 1) {
        const earned = randomInt(20, 80);
        const spent = randomInt(5, Math.floor(earned / 3));
        const found = randomInt(5, 20);
        const answer = earned - spent + found;
        return makeMultipleChoice(
            `You earned ${earned} coins, spent ${spent}, then found ${found} more. How many coins now?`,
            answer, '💰',
            ['Step by step: earn, spend, find.', `${earned} - ${spent} = ${earned - spent}. Then + ${found}.`, `${earned - spent} + ${found} = ${answer}`]
        );
    } else if (type === 2) {
        const a = randomInt(3, 7);
        const b = randomInt(3, 7);
        const c = randomInt(5, 15);
        const answer = a * b + c;
        return makeMultipleChoice(
            `What is ${a} × ${b} + ${c}?`, answer, '🧠',
            ['Multiply first, then add!', `${a} × ${b} = ${a * b}. Then + ${c}.`, `${a * b} + ${c} = ${answer}`]
        );
    } else {
        const factor = randomInt(2, 3);
        const seq = Array.from({ length: 5 }, (_, i) => factor ** (i + 1));
        const answer = factor ** 6;
        return {
            type: 'sequence-next',
            question: 'This pattern multiplies each time!',
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
