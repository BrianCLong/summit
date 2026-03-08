"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSeverity = normalizeSeverity;
exports.computeRiskScore = computeRiskScore;
exports.scoreCveRecord = scoreCveRecord;
exports.severityWeights = severityWeights;
const DEFAULT_SEVERITY_WEIGHTS = {
    CRITICAL: 10,
    HIGH: 7,
    MEDIUM: 4,
    LOW: 2,
    UNKNOWN: 1,
};
const DEFAULT_DATA_ACCESS_WEIGHTS = {
    none: 0,
    read: 1,
    write: 3,
    admin: 5,
};
const DEFAULT_NETWORK_WEIGHTS = {
    none: 0,
    restricted: 1,
    unrestricted: 4,
};
function normalizeSeverity(raw) {
    switch (raw?.toUpperCase()) {
        case 'CRITICAL':
            return 'CRITICAL';
        case 'HIGH':
            return 'HIGH';
        case 'MEDIUM':
            return 'MEDIUM';
        case 'LOW':
            return 'LOW';
        default:
            return 'UNKNOWN';
    }
}
function computeRiskScore(profile, options = {}) {
    const base = options.baseScore ?? 1;
    const severityWeights = {
        ...DEFAULT_SEVERITY_WEIGHTS,
        ...(options.cveWeightOverride ?? {}),
    };
    const dataWeights = {
        ...DEFAULT_DATA_ACCESS_WEIGHTS,
        ...(options.dataAccessWeights ?? {}),
    };
    const networkWeights = {
        ...DEFAULT_NETWORK_WEIGHTS,
        ...(options.networkWeights ?? {}),
    };
    const cveScore = profile.cves.reduce((total, cve) => total + severityWeights[cve.severity], 0);
    const dataScore = dataWeights[profile.dataAccessScope];
    const networkScore = profile.networkEgressClasses.reduce((total, cls) => total + networkWeights[cls], 0);
    const rawScore = base + cveScore + dataScore + networkScore;
    return Number(rawScore.toFixed(2));
}
function scoreCveRecord(record, options) {
    const severityWeights = {
        ...DEFAULT_SEVERITY_WEIGHTS,
        ...(options?.cveWeightOverride ?? {}),
    };
    return severityWeights[record.severity];
}
function severityWeights() {
    return { ...DEFAULT_SEVERITY_WEIGHTS };
}
