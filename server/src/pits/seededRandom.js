"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRandom = void 0;
/**
 * Deterministic linear congruential generator so that drills are replayable
 * when the same seed is supplied.
 */
class SeededRandom {
    state;
    constructor(seed) {
        if (!Number.isFinite(seed)) {
            throw new Error('Seed must be a finite number');
        }
        // Prevent zero which would break the generator.
        this.state = Math.abs(Math.floor(seed)) || 1;
    }
    next() {
        // Constants from Numerical Recipes.
        const a = 48271;
        const m = 0x7fffffff; // 2^31 - 1
        this.state = (a * this.state) % m;
        return (this.state - 1) / (m - 1);
    }
    nextInRange(min, max) {
        if (max < min) {
            throw new Error('Invalid range for random number generation');
        }
        const value = this.next();
        return min + (max - min) * value;
    }
}
exports.SeededRandom = SeededRandom;
