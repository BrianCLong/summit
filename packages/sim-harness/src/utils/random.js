"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRandom = void 0;
/**
 * Deterministic random number generator using seed
 * Based on Mulberry32 algorithm
 */
class SeededRandom {
    state;
    constructor(seed) {
        this.state = seed;
    }
    /**
     * Generate next random float [0, 1)
     */
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /**
     * Generate random integer [min, max)
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
    }
    /**
     * Generate random float [min, max)
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }
    /**
     * Generate normal distribution (Box-Muller transform)
     */
    nextNormal(mean, stddev) {
        const u1 = this.next();
        const u2 = this.next();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stddev + mean;
    }
    /**
     * Generate lognormal distribution
     */
    nextLogNormal(mean, stddev) {
        return Math.exp(this.nextNormal(mean, stddev));
    }
    /**
     * Pick random element from array
     */
    choice(array) {
        return array[this.nextInt(0, array.length)];
    }
    /**
     * Shuffle array in place
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    /**
     * Generate random date between start and end
     */
    nextDate(start, end) {
        const startMs = start.getTime();
        const endMs = end.getTime();
        const randomMs = this.nextFloat(startMs, endMs);
        return new Date(randomMs);
    }
    /**
     * Test if event should occur given probability
     */
    chance(probability) {
        return this.next() < probability;
    }
}
exports.SeededRandom = SeededRandom;
