"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeTask = routeTask;
const registry_1 = require("./registry");
const ledger_1 = require("../provenance/ledger");
function routeTask(spec, registry, options) {
    const requiredSkills = (0, registry_1.deriveSkills)(spec);
    const bids = registry.createAoEBids(spec, 12);
    if (!bids.length) {
        return degradedFallback(requiredSkills, 'no-bids');
    }
    const bundles = enumerateBundles(bids, options.maxBundleSize ?? 3);
    let best = null;
    for (const bundle of bundles) {
        const decision = evaluateBundle(bundle, spec, requiredSkills);
        if (decision.estimatedCost > options.costBudgetUsd * 1.05)
            continue;
        if (decision.estimatedLatency > options.latencyBudgetMs * 1.1)
            continue;
        if (!best ||
            decision.coverageScore > best.coverageScore ||
            decision.valueDensity > best.valueDensity) {
            best = decision;
        }
    }
    if (!best) {
        return degradedFallback(requiredSkills, 'budget-constraint');
    }
    (0, ledger_1.recordProvenance)({
        reqId: spec.taskId,
        step: 'router',
        inputHash: (0, ledger_1.hashObject)(requiredSkills),
        outputHash: (0, ledger_1.hashObject)(best.bundle.map((b) => b.modelId)),
        policy: {
            retention: spec.policy.retention,
            purpose: spec.policy.purpose,
            licenseClass: spec.policy.licenseClass,
        },
        time: { start: new Date().toISOString(), end: new Date().toISOString() },
        tags: ['policy-router'],
    });
    const { coverageScore: _coverageScore, valueDensity: _valueDensity, ...decision } = best;
    return decision;
}
function evaluateBundle(bundle, spec, requiredSkills) {
    const unionTags = new Set();
    let quality = 0;
    let latency = 0;
    let cost = 0;
    for (const bid of bundle) {
        quality += bid.est.quality * bid.confidence;
        latency = Math.max(latency, bid.est.latencyMs);
        cost += bid.est.costUSD;
        for (const tag of bid.fitTags)
            unionTags.add(tag);
    }
    const skillsCoverage = (0, registry_1.coverageScore)([...unionTags], requiredSkills);
    const acCoverage = acceptanceCoverage(spec, unionTags);
    const valueDensity = (quality * Math.max(0.1, acCoverage)) / Math.max(0.01, cost * latency);
    return {
        bundle,
        estimatedCost: Number(cost.toFixed(4)),
        estimatedLatency: latency,
        coverage: skillsCoverage,
        acCoverage,
        rationale: bundle.map((b) => b.rationale),
        coverageScore: skillsCoverage,
        valueDensity,
    };
}
function acceptanceCoverage(spec, tags) {
    if (!spec.acceptanceCriteria.length)
        return 1;
    let satisfied = 0;
    for (const ac of spec.acceptanceCriteria) {
        if (!ac.metric)
            continue;
        if (tags.has(ac.metric) ||
            tags.has(ac.verify) ||
            tags.has(ac.statement.toLowerCase())) {
            satisfied += 1;
        }
    }
    return satisfied / spec.acceptanceCriteria.length;
}
function enumerateBundles(bids, maxSize) {
    const bundles = [];
    const limit = Math.min(maxSize, 3);
    function helper(start, current) {
        if (current.length > 0)
            bundles.push([...current]);
        if (current.length === limit)
            return;
        for (let i = start; i < bids.length; i += 1) {
            current.push(bids[i]);
            helper(i + 1, current);
            current.pop();
        }
    }
    helper(0, []);
    return bundles;
}
function degradedFallback(skills, reason) {
    const heuristics = {
        modelId: 'regex-baseline',
        est: { quality: 0.35, latencyMs: 200, costUSD: 0.0 },
        confidence: 0.4,
        fitTags: skills.length ? skills : ['generic'],
        rationale: `Fallback triggered: ${reason}`,
    };
    return {
        bundle: [heuristics],
        estimatedCost: heuristics.est.costUSD,
        estimatedLatency: heuristics.est.latencyMs,
        coverage: skills.length ? 0.4 : 0.2,
        acCoverage: 0.2,
        rationale: [heuristics.rationale],
        fallback: reason,
    };
}
