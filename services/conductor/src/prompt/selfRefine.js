"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfRefine = selfRefine;
const ledger_1 = require("../provenance/ledger");
async function selfRefine(generator, options, specId) {
    let payload = options.initial;
    let best = null;
    for (let attempt = 0; attempt < options.maxLoops; attempt += 1) {
        const ctx = { specId, attempt, payload };
        const result = await generator(ctx);
        const criticScores = await Promise.all(options.critics.map((critic) => critic(result)));
        const score = aggregateScores(criticScores);
        (0, ledger_1.recordProvenance)({
            reqId: specId,
            step: 'critic',
            inputHash: (0, ledger_1.hashObject)(payload),
            outputHash: (0, ledger_1.hashObject)({ result, score }),
            policy: { retention: 'standard-365d', purpose: 'engineering' },
            time: { start: new Date().toISOString(), end: new Date().toISOString() },
            tags: ['self-refine', `attempt:${attempt}`],
        });
        if (!best || score > best.score) {
            best = { result, score };
        }
        if (score >= options.scoreThreshold ||
            criticScores.every((c) => (c.score ?? 0) >= options.scoreThreshold)) {
            return { result, score, iterations: attempt + 1 };
        }
        payload = await options.repair(result, ctx);
    }
    if (!best)
        throw new Error('self refine failed to produce result');
    return {
        result: best.result,
        score: best.score,
        iterations: options.maxLoops,
    };
}
function aggregateScores(scores) {
    const filtered = scores.map((s) => s.score).filter((s) => Number.isFinite(s));
    if (!filtered.length)
        return 0;
    filtered.sort((a, b) => a - b);
    const trim = filtered.length > 4 ? Math.floor(filtered.length * 0.1) : 0;
    const trimmed = filtered.slice(trim, filtered.length - trim || undefined);
    const pool = trimmed.length ? trimmed : filtered;
    const sum = pool.reduce((acc, val) => acc + val, 0);
    return sum / pool.length;
}
