const HISTORY_SIZE = 8;

export class DifficultyTracker {
    constructor(initialLevel = 1, maxLevel = 5) {
        this.maxLevel = Math.max(1, Math.min(5, maxLevel));
        this.level = Math.min(initialLevel, this.maxLevel);
        this.history = [];
    }

    record(correct) {
        this.history.push(correct);
        if (this.history.length > HISTORY_SIZE) {
            this.history.shift();
        }
        this._adjust();
    }

    _adjust() {
        if (this.history.length < 4) return;

        const accuracy = this.history.filter(Boolean).length / this.history.length;

        // Gentler thresholds for kids — need sustained success to level up
        if (accuracy >= 0.9 && this.level < this.maxLevel) {
            this.level++;
            this.history = [];
        } else if (accuracy < 0.4 && this.level > 1) {
            this.level--;
            this.history = [];
        }
    }

    getLevel() {
        return this.level;
    }

    getAccuracy() {
        if (this.history.length === 0) return 0;
        return Math.round((this.history.filter(Boolean).length / this.history.length) * 100);
    }
}
