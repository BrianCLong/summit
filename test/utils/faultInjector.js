"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFaultInjector = exports.FaultInjector = void 0;
const hashSeed = (input) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0; // Force 32-bit integer
    }
    return Math.abs(hash);
};
class FaultInjector {
    firstFaultAt;
    seed;
    scenario;
    injections = 0;
    constructor(seed, scenario) {
        this.seed = seed;
        this.scenario = scenario;
        const hashed = hashSeed(`${seed}:${scenario}`);
        this.firstFaultAt = (hashed % 2) + 1; // deterministically 1 or 2
    }
    nextFault() {
        this.injections += 1;
        if (this.scenario === 'none') {
            return null;
        }
        if (this.scenario === 'transient-timeout') {
            if (this.injections === this.firstFaultAt) {
                return {
                    kind: 'transient',
                    code: 'ETIMEDOUT',
                    message: `Injected timeout [seed=${this.seed}]`,
                };
            }
            return null;
        }
        return {
            kind: 'permanent',
            code: 'INGESTION_PERMANENT_FAILURE',
            message: `Injected permanent failure [seed=${this.seed}]`,
        };
    }
}
exports.FaultInjector = FaultInjector;
const createFaultInjector = (seed, scenario) => new FaultInjector(seed, scenario);
exports.createFaultInjector = createFaultInjector;
