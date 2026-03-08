"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planContext = planContext;
const ledger_1 = require("../provenance/ledger");
function planContext(spec, available, opts) {
    const tokenBudget = opts.tokenBudget;
    const enriched = scoreArtifacts(spec, available);
    const selected = [];
    const discarded = [];
    let totalTokens = 0;
    for (const artifact of enriched.sort((a, b) => (b.score || 0) - (a.score || 0))) {
        const tokens = artifact.tokens ?? estimateTokens(artifact);
        if (totalTokens + tokens > tokenBudget) {
            discarded.push(artifact);
            continue;
        }
        totalTokens += tokens;
        selected.push({ ...artifact, tokens });
    }
    (0, ledger_1.recordProvenance)({
        reqId: spec.taskId,
        step: 'planner',
        inputHash: (0, ledger_1.hashObject)(available.map((a) => a.hash)),
        outputHash: (0, ledger_1.hashObject)(selected.map((a) => a.hash)),
        policy: {
            retention: spec.policy.retention,
            purpose: spec.policy.purpose,
            licenseClass: spec.policy.licenseClass,
        },
        time: {
            start: (opts.now || new Date()).toISOString(),
            end: new Date().toISOString(),
        },
        tags: ['context', 'planner'],
    });
    return { selected, discarded, totalTokens };
}
function scoreArtifacts(spec, artifacts) {
    const keywords = buildKeywords(spec);
    return artifacts.map((artifact) => {
        const relevance = computeRelevance(artifact, keywords);
        const freshness = computeFreshness(artifact);
        return { ...artifact, score: relevance * 0.8 + freshness * 0.2 };
    });
}
function buildKeywords(spec) {
    const tokens = `${spec.goal} ${spec.acceptanceCriteria.map((ac) => ac.statement).join(' ')}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
    return new Set(tokens);
}
function computeRelevance(artifact, keywords) {
    const haystack = `${artifact.description || ''}`.toLowerCase();
    let hits = 0;
    for (const keyword of keywords) {
        if (keyword.length < 3)
            continue;
        if (haystack.includes(keyword))
            hits += 1;
        if (artifact.facets?.some((f) => f.toLowerCase().includes(keyword)))
            hits += 2;
    }
    return hits / Math.max(1, keywords.size);
}
function computeFreshness(artifact) {
    const match = artifact.description?.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match)
        return 0.5;
    const days = (Date.now() - Date.parse(match[1])) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(1, 1 - days / 30));
}
function estimateTokens(artifact) {
    const length = artifact.description?.length || 100;
    return Math.ceil(length / 4);
}
