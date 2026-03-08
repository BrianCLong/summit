#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_util_1 = require("node:util");
// Simple pseudo-random generator based on seed
function createRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}
async function main() {
    const options = {
        times: { type: 'string', short: 'n' },
        seed: { type: 'string', short: 's' },
        input: { type: 'string', short: 'i' },
    };
    try {
        const { values } = (0, node_util_1.parseArgs)({ options });
        const times = parseInt(values.times || '1', 10);
        const seed = parseInt(values.seed || '0', 10);
        const inputPath = values.input;
        if (!inputPath) {
            // If run without input, and we are not in a test context (how to detect?), throw.
            // But if we just want to allow import without running, we should check something.
            // For now, let's rely on the fact that parseArgs throws if args are missing?
            // No, we didn't set strict requirements in parseArgs options.
            throw new Error('--input argument is required');
        }
        const receiptContent = await promises_1.default.readFile(inputPath, 'utf-8');
        const receipt = JSON.parse(receiptContent);
        const result = {
            times,
            persistedCount: 0,
            dedupedCount: 0,
            errors: [],
        };
        // Simulated DB state (in-memory for this run)
        const persistedIds = new Set();
        const random = createRandom(seed);
        for (let i = 0; i < times; i++) {
            try {
                // Simulate network/processing jitter call to consume random state
                random();
                // Deterministic simulation logic
                if (persistedIds.has(receipt.id)) {
                    result.dedupedCount++;
                }
                else {
                    persistedIds.add(receipt.id);
                    result.persistedCount++;
                }
            }
            catch (err) {
                result.errors.push(err.message);
            }
        }
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        // Only log and exit if we are the main module?
        // Or if error is relevant.
        if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION' || error.message.includes('required')) {
            console.error(JSON.stringify({ error: error.message }));
            process.exit(1);
        }
        // If imported and main called manually, we might want to rethrow?
        // But for CLI usage, exit 1 is good.
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}
// Run main.
// We assume this script is always executed as a CLI tool.
main();
