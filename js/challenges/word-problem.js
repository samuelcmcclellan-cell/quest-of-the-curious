import { ChallengeBase } from './challenge-base.js';
import * as sound from '../engine/sound.js';
import { bigCorrectCelebration, splashEffect, goldenGlow } from '../engine/particles.js';
import { pickCorrectPhrase } from '../engine/profile-theme.js';
import { getCurrentProfileMeta, isJuniorTier } from '../state.js';

export class WordProblem extends ChallengeBase {
    constructor(data, container) {
        super(data, container);
        this.entry = '';
        this.locked = false;
        this.scratchOpen = false;
    }

    render() {
        const steps = Array.isArray(this.data.steps) ? this.data.steps : [];
        const stepsHtml = steps.length
            ? `<ol class="wp-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`
            : '';

        this.container.innerHTML = `
            <div class="challenge-question">
                <div class="challenge-illustration anim-float">${this.data.illustration || '📖'}</div>
                <p>${this.data.question}</p>
            </div>
            <div class="challenge-area">
                <div class="wp-story">
                    ${stepsHtml}
                </div>
                <div class="wp-display" id="wp-display" aria-live="polite">_</div>
                <div class="wp-keypad" id="wp-keypad">
                    ${[1,2,3,4,5,6,7,8,9].map(d => `<button class="wp-key" data-key="${d}">${d}</button>`).join('')}
                    <button class="wp-key wp-key-wide" data-key="clear">C</button>
                    <button class="wp-key" data-key="0">0</button>
                    <button class="wp-key wp-key-wide" data-key="back">⌫</button>
                </div>
                <button class="wp-scratch-toggle" id="wp-scratch-toggle" type="button">📝 Mostrar Rascunho</button>
                <textarea class="wp-scratch" id="wp-scratch" rows="3" placeholder="Rascunho (só para você)" style="display:none;"></textarea>
                <div id="hint-container"></div>
                <button class="hint-btn" id="hint-btn">
                    🦉 Pedir Ajuda
                    <span id="hint-count">(${this.maxHints - this.hintsUsed} restantes)</span>
                </button>
                <button class="btn btn-primary" id="wp-check" style="display:none;">Verificar Resposta ✓</button>
            </div>
        `;

        this._setupKeypad();
        this._setupScratch();
        this._setupHints();
        this._setupCheck();
    }

    _setupKeypad() {
        const keypad = this.container.querySelector('#wp-keypad');
        keypad.addEventListener('click', (e) => {
            const btn = e.target.closest('.wp-key');
            if (!btn || this.locked) return;
            const key = btn.dataset.key;

            if (key === 'clear') {
                this.entry = '';
            } else if (key === 'back') {
                this.entry = this.entry.slice(0, -1);
            } else {
                if (this.entry.length >= 6) return;
                if (this.entry === '' && key === '0') return;
                this.entry += key;
            }

            sound.tap();
            this._updateDisplay();
        });
    }

    _updateDisplay() {
        const display = this.container.querySelector('#wp-display');
        display.textContent = this.entry === '' ? '_' : this.entry;
        const checkBtn = this.container.querySelector('#wp-check');
        checkBtn.style.display = this.entry === '' ? 'none' : 'inline-flex';
    }

    _setupScratch() {
        const toggle = this.container.querySelector('#wp-scratch-toggle');
        const scratch = this.container.querySelector('#wp-scratch');
        toggle.addEventListener('click', () => {
            this.scratchOpen = !this.scratchOpen;
            scratch.style.display = this.scratchOpen ? 'block' : 'none';
            toggle.textContent = this.scratchOpen ? '📝 Esconder Rascunho' : '📝 Mostrar Rascunho';
            sound.tap();
            if (this.scratchOpen) scratch.focus();
        });
    }

    _setupCheck() {
        const checkBtn = this.container.querySelector('#wp-check');
        const display = this.container.querySelector('#wp-display');
        checkBtn.addEventListener('click', () => {
            if (this.entry === '' || this.locked) return;
            const answer = parseInt(this.entry, 10);
            const result = this.checkAnswer(answer);

            if (result.correct) {
                this.locked = true;
                this.recordCorrect();
                display.classList.add('wp-display-correct');
                goldenGlow(display);
                bigCorrectCelebration(display, pickCorrectPhrase());
                sound.correct();
                checkBtn.style.display = 'none';

                setTimeout(() => {
                    if (this.onComplete) this.onComplete(this.getScore());
                }, 600);
            } else {
                this.recordWrong();
                sound.wrong();
                display.classList.add('wp-display-wrong', 'anim-shake');
                splashEffect(display);
                this.locked = true;

                setTimeout(() => {
                    display.classList.remove('wp-display-wrong', 'anim-shake');
                    this.entry = '';
                    this._updateDisplay();
                    this.locked = false;
                    if (isJuniorTier(getCurrentProfileMeta()) && this.attempts === 1 && this.hintsUsed === 0) {
                        const hintBtn = this.container.querySelector('#hint-btn');
                        if (hintBtn) hintBtn.click();
                    }
                }, 650);
            }
        });
    }

    _setupHints() {
        const hintBtn = this.container.querySelector('#hint-btn');
        hintBtn.addEventListener('click', () => {
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
            if (remaining > 0) {
                hintCount.textContent = `(${remaining} restantes)`;
            } else {
                hintBtn.style.opacity = '0.4';
                hintBtn.style.pointerEvents = 'none';
                hintCount.textContent = '(sem mais dicas)';
            }
        });
    }
}
