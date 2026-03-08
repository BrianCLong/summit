"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectRelevantCves = collectRelevantCves;
exports.applyCvesToProfile = applyCvesToProfile;
const scoring_js_1 = require("./scoring.js");
function extractSummary(descriptions) {
    const english = descriptions.find((d) => d.lang.toLowerCase() === 'en');
    return (english?.value ?? descriptions[0]?.value ?? 'No description available.');
}
function extractSeverity(metrics) {
    if (!metrics) {
        return { severity: undefined, score: 0 };
    }
    const cvss = metrics.cvssMetricV31?.[0] ??
        metrics.cvssMetricV30?.[0] ??
        metrics.cvssMetricV2?.[0];
    if (!cvss) {
        return { severity: undefined, score: 0 };
    }
    return {
        severity: cvss.cvssData.baseSeverity,
        score: cvss.cvssData.baseScore,
    };
}
function matchTool(criteria, tool) {
    const normalizedCriteria = criteria.toLowerCase();
    const normalizedTool = tool.toLowerCase();
    return normalizedCriteria.includes(normalizedTool);
}
function collectRelevantCves(feed, tool) {
    const matches = [];
    for (const item of feed.vulnerabilities) {
        const { cve, published } = item;
        const nodes = cve.configurations?.nodes ?? [];
        const cpeMatches = nodes.flatMap((node) => node.cpeMatch ?? []);
        const hasMatch = cpeMatches.some((match) => match.vulnerable && matchTool(match.criteria, tool));
        if (!hasMatch) {
            continue;
        }
        const summary = extractSummary(cve.descriptions ?? []);
        const { severity, score } = extractSeverity(cve.metrics ?? {});
        matches.push({
            id: cve.id,
            severity: (0, scoring_js_1.normalizeSeverity)(severity),
            published,
            summary,
            score,
        });
    }
    return matches;
}
function applyCvesToProfile(profile, cves) {
    const existing = new Map(profile.cves.map((cve) => [cve.id, cve]));
    for (const cve of cves) {
        existing.set(cve.id, cve);
    }
    const nextCves = Array.from(existing.values()).sort((a, b) => a.id.localeCompare(b.id));
    return {
        ...profile,
        cves: nextCves,
        lastUpdated: new Date().toISOString(),
    };
}
