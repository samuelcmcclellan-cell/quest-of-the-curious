const HISTORY_SIZE = 10;

export class DifficultyTracker {
    constructor(initialLevel = 1) {
        this.level = initialLevel;
        this.history = []; // array of booleans (correct/incorrect)
    }

    record(correct) {
        this.history.push(correct);
        if (this.history.length > HISTORY_SIZE) {
            this.history.shift();
        }
        this._adjust();
    }

    _adjust() {
        if (this.history.length < 3) return;

        const accuracy = this.history.filter(Boolean).length / this.history.length;

        if (accuracy > 0.85 && this.level < 5) {
            this.level++;
            this.history = [];
        } else if (accuracy < 0.5 && this.level > 1) {
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
