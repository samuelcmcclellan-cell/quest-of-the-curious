import { ChallengeBase } from './challenge-base.js';
import { InteractionManager } from '../engine/interaction.js';
import * as sound from '../engine/sound.js';
import { correctExplosion, goldenGlow } from '../engine/particles.js';

export class BalanceScale extends ChallengeBase {
    constructor(data, container) {
        super(data, container);
        this.interaction = null;
        this.leftValue = data.leftSide;
        this.rightValue = 0;
        this.placedItems = {};
    }

    render() {
        const availableNums = this.data.availableNumbers;

        this.container.innerHTML = `
            <div class="challenge-question">
                <div class="challenge-illustration anim-float">${this.data.illustration || '⚖️'}</div>
                <p>${this.data.question}</p>
            </div>
            <div class="challenge-area">
                <div class="scale-container" id="scale">
                    <div class="scale-beam" id="scale-beam">
                        <div class="scale-pan scale-pan-left">
                            <div class="scale-pan-value">${this.leftValue}</div>
                            <div class="scale-pan-label">= ${this.leftValue}</div>
                        </div>
                        <div class="scale-fulcrum">⚖️</div>
                        <div class="scale-pan scale-pan-right">
                            <div class="scale-drop-zones" id="drop-zones">
                                ${this.data.dropSlots.map((_, i) => `
                                    <div class="scale-drop" data-drop-zone="right-${i}">?</div>
                                `).join('')}
                            </div>
                            <div class="scale-pan-label" id="right-total">= 0</div>
                        </div>
                    </div>
                </div>
                <div class="scale-numbers" id="available-nums">
                    ${availableNums.map((n, i) => `
                        <div class="scale-num" data-draggable="num-${i}" data-value="${n}">${n}</div>
                    `).join('')}
                </div>
                <div id="hint-container"></div>
                <button class="hint-btn" id="hint-btn">
                    🦉 Pedir Ajuda
                    <span id="hint-count">(${this.maxHints - this.hintsUsed} restantes)</span>
                </button>
            </div>
        `;

        this._setupInteraction();
        this._setupHints();
    }

    _setupInteraction() {
        this.interaction = new InteractionManager(this.container);

        this.interaction.onDrop = (dragId, dropZoneId) => {
            const idx = dragId.replace('num-', '');
            const value = this.data.availableNumbers[parseInt(idx)];
            const dropEl = this.container.querySelector(`[data-drop-zone="${dropZoneId}"]`);

            if (this.placedItems[dropZoneId] !== undefined) {
                const oldIdx = this.placedItems[dropZoneId].idx;
                this.interaction.restoreDraggable(`num-${oldIdx}`);
            }

            this.placedItems[dropZoneId] = { value, idx };
            dropEl.textContent = value;
            dropEl.classList.add('nb-slot-filled');

            // Drop sound + glow
            sound.drop();
            goldenGlow(dropEl);

            this._updateScale();
        };

        this.interaction.onReturn = () => {};
    }

    _updateScale() {
        this.rightValue = Object.values(this.placedItems).reduce((sum, item) => sum + item.value, 0);
        const rightLabel = this.container.querySelector('#right-total');
        rightLabel.textContent = `= ${this.rightValue}`;

        const beam = this.container.querySelector('#scale-beam');
        const diff = this.leftValue - this.rightValue;
        const tilt = Math.max(-8, Math.min(8, diff * 0.5));
        beam.style.transform = `rotate(${tilt}deg)`;

        if (this.rightValue === this.leftValue) {
            beam.style.transform = 'rotate(0deg)';
            rightLabel.style.color = 'var(--success)';
            rightLabel.style.fontWeight = '800';

            this.container.querySelectorAll('[data-drop-zone]').forEach(el => {
                el.classList.add('nb-slot-correct');
            });

            if (this.interaction) this.interaction.destroy();

            // Big celebration
            const scaleEl = this.container.querySelector('#scale');
            correctExplosion(scaleEl);
            sound.correct();

            this.checkAnswer(this.leftValue);
            this.recordCorrect();

            setTimeout(() => {
                if (this.onComplete) this.onComplete(this.getScore());
            }, 1000);
        }
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
