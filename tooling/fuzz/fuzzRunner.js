"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFuzzTargets = runFuzzTargets;
exports.summarize = summarize;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ARTIFACT_ROOT = node_path_1.default.join(process.cwd(), 'artifacts', 'fuzz');
function mulberry32(seed) {
    return function rng() {
        let t = seed += 0x6d2b79f5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function mutateSeed(seed, rng) {
    const buffer = Buffer.from(seed);
    if (buffer.length === 0) {
        return seed;
    }
    const operations = [
        () => {
            const idx = Math.floor(rng() * buffer.length);
            buffer[idx] = (buffer[idx] + Math.floor(rng() * 32)) % 256;
        },
        () => {
            const idx = Math.floor(rng() * buffer.length);
            buffer[idx] = 0;
        },
        () => {
            buffer.reverse();
        },
        () => {
            const idx = Math.floor(rng() * buffer.length);
            const len = Math.max(1, Math.floor(rng() * 4));
            const slice = buffer.subarray(idx, Math.min(buffer.length, idx + len));
            return Buffer.concat([buffer.subarray(0, idx), slice, buffer.subarray(idx)]);
        },
    ];
    const op = operations[Math.floor(rng() * operations.length)];
    const mutated = op() ?? buffer;
    return (mutated instanceof Buffer ? mutated : buffer).toString();
}
function withTimeout(promise, ms, name) {
    let handle;
    const timeoutPromise = new Promise((_, reject) => {
        handle = setTimeout(() => reject(new Error(`Timeout after ${ms}ms in ${name}`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(handle));
}
function ensureArtifactDir() {
    node_fs_1.default.mkdirSync(ARTIFACT_ROOT, { recursive: true });
}
function persistArtifact(target, iteration, input) {
    ensureArtifactDir();
    const filePath = node_path_1.default.join(ARTIFACT_ROOT, `${target}-iteration-${iteration}-${Date.now()}.txt`);
    node_fs_1.default.writeFileSync(filePath, input, 'utf8');
    return filePath;
}
async function runFuzzTargets(targets, seed = 1337) {
    const rng = mulberry32(seed);
    const results = [];
    for (const target of targets) {
        const iterations = target.iterations ?? 50;
        const timeoutMs = target.timeoutMs ?? 50;
        const failures = [];
        for (let i = 0; i < iterations; i += 1) {
            const seedIndex = Math.floor(rng() * target.seeds.length);
            const mutated = mutateSeed(target.seeds[seedIndex], rng);
            try {
                await withTimeout(Promise.resolve(target.handler(mutated)), timeoutMs, target.name);
            }
            catch (error) {
                const artifactPath = persistArtifact(target.name, i, mutated);
                failures.push({
                    iteration: i,
                    error: error instanceof Error ? error.message : String(error),
                    artifactPath,
                });
            }
        }
        results.push({ name: target.name, iterations, failures });
    }
    return results;
}
function summarize(results) {
    return results
        .map((result) => {
        const summary = `${result.name}: ${result.iterations} iterations, ${result.failures.length} failures`;
        if (result.failures.length === 0) {
            return summary;
        }
        const detail = result.failures
            .map((failure) => `  - #${failure.iteration}: ${failure.error} (artifact: ${failure.artifactPath})`)
            .join('\n');
        return `${summary}\n${detail}`;
    })
        .join('\n');
}
