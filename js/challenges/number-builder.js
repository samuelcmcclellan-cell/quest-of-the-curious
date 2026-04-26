import { ChallengeBase } from './challenge-base.js';
import { InteractionManager } from '../engine/interaction.js';
import * as sound from '../engine/sound.js';
import { bigCorrectCelebration, splashEffect, goldenGlow } from '../engine/particles.js';
import { pickCorrectPhrase } from '../engine/profile-theme.js';
import { getCurrentProfileMeta, isJuniorTier } from '../state.js';

export class NumberBuilder extends ChallengeBase {
    constructor(data, container) {
        super(data, container);
        this.interaction = null;
        this.slots = {};
        this.correctDigits = String(data.correct).split('');
    }

    render() {
        const numSlots = this.correctDigits.length;
        const slotLabels = this._getPlaceLabels(numSlots);

        this.container.innerHTML = `
            <div class="challenge-question">
                <div class="challenge-illustration anim-float">${this.data.illustration || '🔢'}</div>
                <p>${this.data.question}</p>
            </div>
            <div class="challenge-area">
                <div class="number-builder-slots" id="slots">
                    ${slotLabels.map((label, i) => `
                        <div class="nb-slot-wrapper">
                            <div class="nb-slot" data-drop-zone="slot-${i}" id="slot-${i}">?</div>
                            <div class="nb-slot-label">${label}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="nb-digits" id="digits">
                    ${[0,1,2,3,4,5,6,7,8,9].map(d => `
                        <div class="nb-digit" data-draggable="digit-${d}">${d}</div>
                    `).join('')}
                </div>
                <div id="hint-container"></div>
                <button class="hint-btn" id="hint-btn">
                    🦉 Pedir Ajuda
                    <span id="hint-count">(${this.maxHints - this.hintsUsed} restantes)</span>
                </button>
                <button class="btn btn-primary" id="check-btn" style="display:none;">Verificar Resposta ✓</button>
            </div>
        `;

        this._setupInteraction();
        this._setupHints();
        this._setupCheck();
    }

    _getPlaceLabels(numSlots) {
        const labels = ['unidades', 'dezenas', 'centenas', 'milhares'];
        return labels.slice(0, numSlots).reverse();
    }

    _setupInteraction() {
        this.interaction = new InteractionManager(this.container);

        this.interaction.onDrop = (dragId, dropZoneId) => {
            const digit = dragId.replace('digit-', '');
            const slotIndex = dropZoneId.replace('slot-', '');
            const slotEl = this.container.querySelector(`#slot-${slotIndex}`);

            if (this.slots[slotIndex] !== undefined) {
                this.interaction.restoreDraggable(`digit-${this.slots[slotIndex]}`);
            }

            this.slots[slotIndex] = digit;
            slotEl.textContent = digit;
            slotEl.classList.add('nb-slot-filled');

            // Drop sound + glow
            sound.drop();
            goldenGlow(slotEl);

            const allFilled = Object.keys(this.slots).length === this.correctDigits.length;
            const checkBtn = this.container.querySelector('#check-btn');
            checkBtn.style.display = allFilled ? 'inline-flex' : 'none';
        };

        this.interaction.onReturn = () => {};
    }

    _setupCheck() {
        const checkBtn = this.container.querySelector('#check-btn');
        checkBtn.addEventListener('click', () => {
            const answer = parseInt(
                this.correctDigits.map((_, i) => this.slots[i] || '0').join('')
            );

            const result = this.checkAnswer(answer);

            if (result.correct) {
                this.recordCorrect();
                const slotsContainer = this.container.querySelector('#slots');
                bigCorrectCelebration(slotsContainer, pickCorrectPhrase());
                sound.correct();

                this.correctDigits.forEach((_, i) => {
                    const slotEl = this.container.querySelector(`#slot-${i}`);
                    slotEl.classList.add('nb-slot-correct');
                });
                checkBtn.style.display = 'none';

                if (this.interaction) this.interaction.destroy();

                setTimeout(() => {
                    if (this.onComplete) this.onComplete(this.getScore());
                }, 600);
            } else {
                this.recordWrong();
                sound.wrong();
                const slotsContainer = this.container.querySelector('#slots');
                slotsContainer.classList.add('anim-shake');
                splashEffect(slotsContainer);

                setTimeout(() => {
                    slotsContainer.classList.remove('anim-shake');
                    this.correctDigits.forEach((correctDigit, i) => {
                        if (this.slots[i] !== correctDigit) {
                            const slotEl = this.container.querySelector(`#slot-${i}`);
                            slotEl.textContent = '?';
                            slotEl.classList.remove('nb-slot-filled');
                            if (this.slots[i] !== undefined) {
                                this.interaction.restoreDraggable(`digit-${this.slots[i]}`);
                            }
                            delete this.slots[i];
                        } else {
                            const slotEl = this.container.querySelector(`#slot-${i}`);
                            slotEl.classList.add('nb-slot-correct');
                        }
                    });
                    checkBtn.style.display = 'none';
                    if (isJuniorTier(getCurrentProfileMeta()) && this.attempts === 1 && this.hintsUsed === 0) {
                        const hintBtn = this.container.querySelector('#hint-btn');
                        if (hintBtn) hintBtn.click();
                    }
                }, 500);
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

    destroy() {
        if (this.interaction) {
            this.interaction.destroy();
            this.interaction = null;
        }
        super.destroy();
    }
}
