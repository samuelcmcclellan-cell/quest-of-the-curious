import { recordWrongAnswer, resetWrongAnswers, getWrongAnswerCount } from '../state.js';

// Speed-star thresholds (ms) per difficulty tier.
const SPEED_THRESHOLDS = { 1: 12000, 2: 18000, 3: 25000, 4: 35000, 5: 45000 };

export class ChallengeBase {
    constructor(data, container) {
        this.data = data;
        this.container = container;
        this.attempts = 0;
        this.hintsUsed = 0;
        this.maxHints = data.hints ? data.hints.length : 3;
        this.solved = false;
        this.onComplete = null;
        this.startTime = Date.now();
        this.turboBonus = 1;
    }

    getElapsedMs() {
        return Date.now() - this.startTime;
    }

    earnedSpeedStar() {
        if (!this.solved) return false;
        if (this.hintsUsed > 0) return false;
        if (this.attempts > 1) return false;
        const tier = Math.min(Math.max(this.data.difficulty || 1, 1), 5);
        const threshold = SPEED_THRESHOLDS[tier] * this.turboBonus;
        return this.getElapsedMs() <= threshold;
    }

    render() {
        // Override in subclass
    }

    checkAnswer(answer) {
        this.attempts++;
        const correct = answer === this.data.correct;

        if (correct) {
            this.solved = true;
        }

        return { correct };
    }

    /**
     * Record a wrong answer globally (persists via state). Returns
     * { wrongCount, locked } so the subclass / screen can update the
     * heart strip and transition to lockout when triggered.
     * Also dispatches a 'quest:wrong-answer' custom event so the
     * challenge screen (or practice screen) can re-render its heart strip
     * without each challenge type knowing about the UI.
     */
    recordWrong() {
        const result = recordWrongAnswer();
        const count = getWrongAnswerCount();
        document.dispatchEvent(new CustomEvent('quest:wrong-answer', {
            detail: { wrongCount: count, locked: result.locked }
        }));
        return result;
    }

    /**
     * Reset wrong-answer counter (call on correct answers). Also
     * dispatches 'quest:correct-answer' so the UI can clear heart pips.
     */
    recordCorrect() {
        resetWrongAnswers();
        document.dispatchEvent(new CustomEvent('quest:correct-answer'));
    }

    showHint() {
        if (this.hintsUsed < this.maxHints) {
            const hint = this.data.hints[this.hintsUsed];
            this.hintsUsed++;
            return hint;
        }
        return null;
    }

    getScore() {
        if (!this.solved) return 0;
        if (this.hintsUsed === 0 && this.attempts === 1) return 3;
        if (this.hintsUsed === 0) return 2;
        return 1;
    }

    destroy() {
        this.container.innerHTML = '';
    }
}
