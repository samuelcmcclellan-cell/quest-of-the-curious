import { ChallengeBase } from './challenge-base.js';
import * as sound from '../engine/sound.js';
import { bigCorrectCelebration, splashEffect } from '../engine/particles.js';
import { pickCorrectPhrase } from '../engine/profile-theme.js';

export class MultipleChoice extends ChallengeBase {
    constructor(data, container) {
        super(data, container);
        this.buttons = [];
        this.hintEl = null;
        this.locked = false;
    }

    render() {
        this.container.innerHTML = `
            <div class="challenge-question">
                <div class="challenge-illustration anim-float">${this.data.illustration || '🔢'}</div>
                <p>${this.data.question}</p>
            </div>
            <div class="challenge-area">
                <div class="choices" id="choices"></div>
                <div id="hint-container"></div>
                <button class="hint-btn" id="hint-btn">
                    🦉 Pedir Ajuda
                    <span id="hint-count">(${this.maxHints - this.hintsUsed} restantes)</span>
                </button>
            </div>
        `;

        const choicesEl = this.container.querySelector('#choices');
        this.hintContainer = this.container.querySelector('#hint-container');

        this.data.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => this.handleChoice(option, btn));
            choicesEl.appendChild(btn);
            this.buttons.push(btn);
        });

        const hintBtn = this.container.querySelector('#hint-btn');
        hintBtn.addEventListener('click', () => this.handleHint());
    }

    handleChoice(answer, btn) {
        if (this.locked || this.solved) return;

        const result = this.checkAnswer(answer);

        if (result.correct) {
            this.locked = true;
            this.recordCorrect();
            btn.classList.add('choice-btn-correct', 'anim-bounce');

            // Big celebration on the correct button
            bigCorrectCelebration(btn, pickCorrectPhrase());
            sound.correct();

            // Disable all buttons
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
            }, 600);
        }
    }

    handleHint() {
        const hint = this.showHint();
        if (!hint) return;

        sound.tap();

        this.hintContainer.innerHTML = `
            <div class="hint-area anim-fade-in">
                <span style="font-size:1.5rem;">🦉💡</span>
                <span>${hint}</span>
            </div>
        `;

        const hintCount = this.container.querySelector('#hint-count');
        const remaining = this.maxHints - this.hintsUsed;
        if (remaining > 0) {
            hintCount.textContent = `(${remaining} restantes)`;
        } else {
            const hintBtn = this.container.querySelector('#hint-btn');
            hintBtn.style.opacity = '0.4';
            hintBtn.style.pointerEvents = 'none';
            hintCount.textContent = '(sem mais dicas)';
        }

        // Level 2 hint: eliminate two wrong answers
        if (this.hintsUsed === 2) {
            const wrongButtons = this.buttons.filter(
                b => b.textContent != this.data.correct && !b.classList.contains('choice-btn-eliminated')
            );
            wrongButtons.slice(0, 2).forEach(b => {
                b.classList.add('choice-btn-eliminated');
            });
        }
    }

    destroy() {
        this.buttons = [];
        super.destroy();
    }
}
