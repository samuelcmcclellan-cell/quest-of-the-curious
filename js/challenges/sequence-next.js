import { ChallengeBase } from './challenge-base.js';
import * as sound from '../engine/sound.js';

export class SequenceNext extends ChallengeBase {
    constructor(data, container) {
        super(data, container);
        this.locked = false;
    }

    render() {
        this.container.innerHTML = `
            <div class="challenge-question">
                <div style="font-size:3rem;margin-bottom:12px;">${this.data.illustration || '🔢'}</div>
                <p>${this.data.question}</p>
            </div>
            <div class="challenge-area">
                <div class="sequence-display" id="sequence">
                    ${this.data.sequence.map((item, i) => `
                        <div class="seq-item ${i === this.data.sequence.length - 1 && item === '?' ? 'seq-item-blank' : 'seq-item-filled'}">
                            ${item}
                        </div>
                        ${i < this.data.sequence.length - 1 ? '<div class="seq-arrow">→</div>' : ''}
                    `).join('')}
                </div>
                <p style="font-size:1rem;color:var(--text-light);margin:8px 0;">What comes next?</p>
                <div class="choices" id="choices"></div>
                <div id="hint-container"></div>
                <button class="hint-btn" id="hint-btn">
                    🦉 Ask Owl for Help
                    <span id="hint-count">(${this.maxHints - this.hintsUsed} left)</span>
                </button>
            </div>
        `;

        const choicesEl = this.container.querySelector('#choices');
        this.buttons = [];

        this.data.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => this._handleChoice(option, btn));
            choicesEl.appendChild(btn);
            this.buttons.push(btn);
        });

        this._setupHints();
    }

    _handleChoice(answer, btn) {
        if (this.locked || this.solved) return;

        const result = this.checkAnswer(answer);

        if (result.correct) {
            this.locked = true;
            btn.classList.add('choice-btn-correct', 'anim-bounce');
            sound.correct();

            // Fill in the blank in the sequence
            const blankEl = this.container.querySelector('.seq-item-blank');
            if (blankEl) {
                blankEl.textContent = answer;
                blankEl.classList.remove('seq-item-blank');
                blankEl.classList.add('seq-item-filled', 'seq-item-correct', 'anim-bounce');
            }

            this.buttons.forEach(b => {
                if (b !== btn) b.style.opacity = '0.5';
                b.style.pointerEvents = 'none';
            });

            setTimeout(() => {
                if (this.onComplete) this.onComplete(this.getScore());
            }, 800);
        } else {
            btn.classList.add('choice-btn-wrong', 'anim-shake');
            sound.wrong();
            this.locked = true;

            setTimeout(() => {
                btn.classList.remove('choice-btn-wrong', 'anim-shake');
                btn.classList.add('choice-btn-eliminated');
                this.locked = false;
            }, 600);
        }
    }

    _setupHints() {
        const hintBtn = this.container.querySelector('#hint-btn');
        hintBtn.addEventListener('click', () => {
            const hint = this.showHint();
            if (!hint) return;

            this.container.querySelector('#hint-container').innerHTML = `
                <div class="hint-area anim-fade-in">
                    <span style="font-size:1.5rem;">🦉</span>
                    <span>${hint}</span>
                </div>
            `;

            const remaining = this.maxHints - this.hintsUsed;
            const hintCount = this.container.querySelector('#hint-count');
            if (remaining > 0) {
                hintCount.textContent = `(${remaining} left)`;
            } else {
                hintBtn.style.opacity = '0.4';
                hintBtn.style.pointerEvents = 'none';
                hintCount.textContent = '(no more hints)';
            }

            if (this.hintsUsed === 2) {
                const wrongBtns = this.buttons.filter(
                    b => b.textContent != this.data.correct && !b.classList.contains('choice-btn-eliminated')
                );
                wrongBtns.slice(0, 2).forEach(b => b.classList.add('choice-btn-eliminated'));
            }
        });
    }

    destroy() {
        this.buttons = [];
        super.destroy();
    }
}
