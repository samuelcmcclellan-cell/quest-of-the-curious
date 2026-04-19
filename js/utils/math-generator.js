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
            `Você encontrou ${a} conchas e depois mais ${b}! Quantas conchas?`,
            `${a} peixes estão nadando, e mais ${b} se juntam. Quantos peixes agora?`,
            `Você tem ${a} moedas e encontra mais ${b}. Quantas moedas no total?`,
        ];
        return makeMultipleChoice(
            pick(stories), answer, pick(['🐚', '🐠', '💰']),
            [`Conte juntos: ${a} mais ${b}.`, `Comece em ${a} e conte mais ${b}: ${Array.from({length: b}, (_, i) => a + i + 1).join(', ')}.`, `${a} + ${b} = ${answer}`]
        );
    } else if (type === 1) {
        // Single-digit subtraction (result >= 0)
        const a = randomInt(3, 9);
        const b = randomInt(1, a);
        const answer = a - b;
        const stories = [
            `Você tinha ${a} conchas mas deu ${b}. Quantas sobraram?`,
            `${a} pássaros estavam numa pedra. ${b} voaram. Quantos sobraram?`,
        ];
        return makeMultipleChoice(
            pick(stories), answer, pick(['🐚', '🐦']),
            [`Comece com ${a} e tire ${b}.`, `Conte para trás ${b} a partir de ${a}.`, `${a} - ${b} = ${answer}`]
        );
    } else {
        // Counting multiplication (2-5 × 1-5)
        const a = randomInt(2, 5);
        const b = randomInt(1, 5);
        const answer = a * b;
        const stories = [
            `Há ${a} grupos de ${b} conchas. Quantas conchas no total?`,
            `${a} peixes têm ${b} listras cada. Quantas listras no total?`,
        ];
        return makeMultipleChoice(
            pick(stories), answer, pick(['🐚', '🐠']),
            [`Você tem ${a} grupos de ${b}.`, `Conte de ${b} em ${b}: ${Array.from({length: a}, (_, i) => b * (i + 1)).join(', ')}.`, `${a} × ${b} = ${answer}`]
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
            `Quanto é ${a} × ${b}?`, answer, '🧮',
            [`Pense em ${a} grupos de ${b}.`, `Conte de ${b} em ${b}: ${Array.from({length: a}, (_, i) => b * (i + 1)).join(', ')}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        // 2-digit addition (friendly numbers)
        const a = randomInt(10, 50);
        const b = randomInt(10, 50);
        const answer = a + b;
        return makeMultipleChoice(
            `Quanto é ${a} + ${b}?`, answer, '🐠',
            ['Some as unidades primeiro, depois as dezenas.', `${a % 10} + ${b % 10} = ${a % 10 + b % 10}`, `${a} + ${b} = ${answer}`]
        );
    } else {
        // 2-digit subtraction
        const a = randomInt(20, 60);
        const b = randomInt(5, a - 5);
        const answer = a - b;
        return makeMultipleChoice(
            `Quanto é ${a} - ${b}?`, answer, '🐚',
            ['Subtraia as unidades primeiro, depois as dezenas.', `Você pode contar de ${b} até ${a}.`, `${a} - ${b} = ${answer}`]
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
            `Quanto é ${a} × ${b}?`, answer, '🐬',
            [`Separe: (${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b})`, `${Math.floor(a / 10) * 10 * b} + ${a % 10 * b}`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        // Simple division
        const b = randomInt(2, 6);
        const answer = randomInt(2, 10);
        const a = b * answer;
        return makeMultipleChoice(
            `Quanto é ${a} ÷ ${b}?`, answer, '🐙',
            [`Pense: qual número vezes ${b} é igual a ${a}?`, `${b} × ? = ${a}`, `${a} ÷ ${b} = ${answer}`]
        );
    } else {
        // Number builder with 2-digit + 2-digit
        const a = randomInt(20, 60);
        const b = randomInt(20, 60);
        const answer = a + b;
        return {
            type: 'number-builder',
            question: `Monte a resposta: ${a} + ${b} = ?`,
            illustration: '🧮',
            correct: answer,
            hints: [`Some as unidades primeiro: ${a % 10} + ${b % 10}`, `Depois some as dezenas. Não esqueça de levar!`, `${a} + ${b} = ${answer}`],
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
            `Quanto é ${a} × ${b}?`, answer, '🦀',
            [`Divida ${a} em ${Math.floor(a / 10) * 10} + ${a % 10}, depois multiplique cada.`, `(${Math.floor(a / 10) * 10} × ${b}) + (${a % 10} × ${b})`, `${a} × ${b} = ${answer}`]
        );
    } else if (type === 1) {
        const items = ['peixes', 'conchas', 'estrelas-do-mar', 'pérolas', 'moedas'];
        const item = pick(items);
        const groups = randomInt(3, 6);
        const perGroup = randomInt(4, 10);
        const total = groups * perGroup;
        return makeMultipleChoice(
            `Se você dividir ${total} ${item} igualmente em ${groups} grupos, quantos em cada grupo?`,
            perGroup, '🐟',
            [`Divida ${total} por ${groups}.`, `${groups} × ? = ${total}`, `${total} ÷ ${groups} = ${perGroup}`]
        );
    } else {
        const start = randomInt(2, 8);
        const step = randomInt(3, 6);
        const seq = Array.from({ length: 5 }, (_, i) => start + step * i);
        const answer = start + step * 5;
        return {
            type: 'sequence-next',
            question: 'Encontre o padrão! O que vem a seguir?',
            illustration: '🔢',
            sequence: [...seq, '?'],
            options: shuffle([answer, answer + step, answer - 1, answer + randomInt(1, 3)]).slice(0, 4),
            correct: answer,
            hints: [`Veja a diferença entre os números.`, `Cada número aumenta ${step}.`, `${seq[4]} + ${step} = ${answer}`],
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
            `Uma piscina retangular tem ${l}m de comprimento e ${w}m de largura. Qual é o perímetro?`,
            perimeter, '🏊',
            ['Perímetro = 2 × (comprimento + largura)', `2 × (${l} + ${w}) = 2 × ${l + w}`, `Perímetro = ${perimeter} metros`]
        );
    } else if (type === 1) {
        const earned = randomInt(20, 80);
        const spent = randomInt(5, Math.floor(earned / 3));
        const found = randomInt(5, 20);
        const answer = earned - spent + found;
        return makeMultipleChoice(
            `Você ganhou ${earned} moedas, gastou ${spent}, e depois encontrou mais ${found}. Quantas moedas agora?`,
            answer, '💰',
            ['Passo a passo: ganhe, gaste, encontre.', `${earned} - ${spent} = ${earned - spent}. Depois + ${found}.`, `${earned - spent} + ${found} = ${answer}`]
        );
    } else if (type === 2) {
        const a = randomInt(3, 7);
        const b = randomInt(3, 7);
        const c = randomInt(5, 15);
        const answer = a * b + c;
        return makeMultipleChoice(
            `Quanto é ${a} × ${b} + ${c}?`, answer, '🧠',
            ['Multiplique primeiro, depois some!', `${a} × ${b} = ${a * b}. Depois + ${c}.`, `${a * b} + ${c} = ${answer}`]
        );
    } else {
        const factor = randomInt(2, 3);
        const seq = Array.from({ length: 5 }, (_, i) => factor ** (i + 1));
        const answer = factor ** 6;
        return {
            type: 'sequence-next',
            question: 'Este padrão multiplica cada vez!',
            illustration: '🚀',
            sequence: [...seq, '?'],
            options: shuffle([answer, answer + factor, answer * 2, answer - factor]).slice(0, 4),
            correct: answer,
            hints: [`Cada número é multiplicado por ${factor}.`, `${seq[3]} × ${factor} = ${seq[4]}, então ${seq[4]} × ${factor} = ?`, `${seq[4]} × ${factor} = ${answer}`],
        };
    }
}

const GENERATORS = [level1, level2, level3, level4, level5];

export function generateChallenge(difficulty) {
    const level = Math.max(1, Math.min(5, difficulty));
    return GENERATORS[level - 1]();
}
