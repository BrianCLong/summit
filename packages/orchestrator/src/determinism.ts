/**
 * Deterministic PRNG and utilities for Summit Agent Runs.
 */
import { v4 as uuidv4, v5 as uuidv5, validate as validateUUID } from 'uuid';

// LCG Constants (Park-Miller)
const MODULUS = 2147483647;
const MULTIPLIER = 48271;
const INCREMENT = 0;

let _seed = 12345;

/**
 * Set the global seed for deterministic operations.
 * @param seed The seed value (must be a non-zero integer).
 */
export function setGlobalSeed(seed: number) {
    if (seed <= 0) {
        throw new Error('Seed must be a positive integer');
    }
    _seed = seed % MODULUS;
}

/**
 * Generate a pseudo-random integer using LCG.
 * Not cryptographically secure, but deterministic.
 */
function nextInt(): number {
    _seed = (MULTIPLIER * _seed + INCREMENT) % MODULUS;
    return _seed;
}

/**
 * Generate a pseudo-random float between 0 (inclusive) and 1 (exclusive).
 */
export function deterministicSampling(): number {
    return (nextInt() - 1) / (MODULUS - 1);
}

/**
 * Generate a deterministic UUID.
 * If input is provided, uses UUID v5 (SHA-1 hash of input + namespace).
 * If input is not provided, uses UUID v4 (random) seeded by the global PRNG.
 *
 * @param namespace - UUID string for v5 namespace, or arbitrary string (hashed if not UUID).
 * @param input - Input string for content-based determinism.
 */
export function deterministicUUID(namespace?: string, input?: string): string {
    if (input) {
        // Content-based determinism (v5)
        const ns = (namespace && validateUUID(namespace))
            ? namespace
            : '00000000-0000-0000-0000-000000000000'; // Default or hashed namespace could be used

        return uuidv5(input, ns);
    }

    // Sequence-based determinism (v4 with custom PRNG)
    const rng = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        rng[i] = Math.floor(deterministicSampling() * 256);
    }
    return uuidv4({ random: rng });
}
