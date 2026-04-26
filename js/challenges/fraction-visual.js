import { ChallengeBase } from './challenge-base.js';
import * as sound from '../engine/sound.js';
import { bigCorrectCelebration, splashEffect } from '../engine/particles.js';
import { pickCorrectPhrase } from '../engine/profile-theme.js';
import { getCurrentProfileMeta, isJuniorTier } from '../state.js';

export class FractionVisual extends ChallengeBase {
    constructor(data, container) {
        super(data, container);
        this.buttons = [];
        this.locked = false;
    }

    render() {
        const shape = this.data.shape === 'bar' ? 'bar' : 'pie';
        const visual = shape === 'bar' ? this._renderBar() : this._renderPie();

        this.container.innerHTML = `
            <div class="challenge-question">
                <div class="challenge-illustration anim-float">${this.data.illustration || '🍰'}</div>
                <p>${this.data.question}</p>
            </div>
            <div class="challenge-area">
                <div class="fraction-visual-stage">${visual}</div>
                <div class="choices" id="choices"></div>
                <div id="hint-container"></div>
                <button class="hint-btn" id="hint-btn">
                    🦉 Pedir Ajuda
                    <span id="hint-count">(${this.maxHints - this.hintsUsed} restantes)</span>
                </button>
            </div>
        `;

        const choicesEl = this.container.querySelector('#choices');
        this.data.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn choice-btn-fraction';
            btn.innerHTML = this._formatFraction(option);
            btn.addEventListener('click', () => this._handleChoice(option, btn));
            choicesEl.appendChild(btn);
            this.buttons.push(btn);
        });

        const hintBtn = this.container.querySelector('#hint-btn');
        hintBtn.addEventListener('click', () => this._handleHint());
    }

    _formatFraction(str) {
        const parts = String(str).split('/');
        if (parts.length === 2) {
            return `<span class="frac"><span class="frac-num">${parts[0]}</span><span class="frac-bar"></span><span class="frac-den">${parts[1]}</span></span>`;
        }
        return String(str);
    }

    _renderPie() {
        const n = this.data.numerator;
        const m = this.data.denominator;
        const radius = 70;
        const cx = 80;
        const cy = 80;
        const slices = [];
        for (let i = 0; i < m; i++) {
            const start = (i / m) * Math.PI * 2 - Math.PI / 2;
            const end = ((i + 1) / m) * Math.PI * 2 - Math.PI / 2;
            const x1 = cx + radius * Math.cos(start);
            const y1 = cy + radius * Math.sin(start);
            const x2 = cx + radius * Math.cos(end);
            const y2 = cy + radius * Math.sin(end);
            const largeArc = (end - start) > Math.PI ? 1 : 0;
            const cls = i < n ? 'fv-slice-filled' : 'fv-slice-empty';
            const d = m === 1
                ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} Z`
                : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            slices.push(`<path d="${d}" class="${cls}" />`);
        }
        return `
            <svg class="fraction-visual-svg" viewBox="0 0 160 160" role="img" aria-label="Fração ilustrada ${n} de ${m}">
                ${slices.join('')}
            </svg>
            <div class="fraction-visual-label">${n} de ${m}</div>
        `;
    }

    _renderBar() {
        const n = this.data.numerator;
        const m = this.data.denominator;
        const cells = [];
        for (let i = 0; i < m; i++) {
            const cls = i < n ? 'fv-cell-filled' : 'fv-cell-empty';
            cells.push(`<div class="fv-cell ${cls}"></div>`);
        }
        return `
            <div class="fraction-visual-bar" role="img" aria-label="Fração ilustrada ${n} de ${m}">
                ${cells.join('')}
            </div>
            <div class="fraction-visual-label">${n} de ${m}</div>
        `;
    }

    _handleChoice(answer, btn) {
        if (this.locked || this.solved) return;
        const result = this.checkAnswer(answer);

        if (result.correct) {
            this.locked = true;
            this.recordCorrect();
            btn.classList.add('choice-btn-correct', 'anim-bounce');
            bigCorrectCelebration(btn, pickCorrectPhrase());
            sound.correct();

            this.buttons.forEach(b => {
                if (b !== btn) b.style.opacity = '0.4';
                b.style.pointerEvents = 'none';
            });

            setTimeout(() => {
                if (this.onComplete) this.onComplete(this.getScore());
            }, 600);
        } else {
            btn.classList.add('choice-btn-wrong', 'anim-shake');
            splashEffect(btn);
            sound.wrong();
            this.locked = true;
            this.recordWrong();

            setTimeout(() => {
                btn.classList.remove('choice-btn-wrong', 'anim-shake');
                btn.classList.add('choice-btn-eliminated');
                this.locked = false;
                if (isJuniorTier(getCurrentProfileMeta()) && this.attempts === 1 && this.hintsUsed === 0) {
                    this._handleHint();
                }
            }, 600);
        }
    }

    _handleHint() {
        const hint = this.showHint();
        if (!hint) return;
        sound.tap();

        this.container.querySelector('#hint-container').innerHTML = `
            <div class="hint-area anim-fade-in">
                <span style="font-size:1.5rem;">🦉💡</span>
                <span>${hint}</span>
            </div>
        `;

        const remaining = this.maxHints - this.hintsUsed;
        const hintCount = this.container.querySelector('#hint-count');
        const hintBtn = this.container.querySelector('#hint-btn');
        if (remaining > 0) {
            hintCount.textContent = `(${remaining} restantes)`;
        } else {
            hintBtn.style.opacity = '0.4';
            hintBtn.style.pointerEvents = 'none';
            hintCount.textContent = '(sem mais dicas)';
        }
    }

    destroy() {
        this.buttons = [];
        super.destroy();
    }
}
