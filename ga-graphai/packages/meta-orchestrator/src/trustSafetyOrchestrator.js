"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRUST_SAFETY_DEFAULTS = exports.TrustSafetyOrchestrator = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const DEFAULT_GUARDRAILS = {
    apiReadP95Ms: 350,
    apiWriteP95Ms: 700,
    subscriptionP95Ms: 250,
    graphOneHopMs: 300,
    graphMultiHopMs: 1200,
    ingestThroughputPerPod: 1000,
    ingestLatencyP95Ms: 100,
    availability: 0.999,
    costPerKIngestUsd: 0.1,
    costPerMGraphqlUsd: 2,
};
const DEFAULT_LATENCY_BUDGETS = [
    { name: 'ingest', maxP95Ms: 100 },
    { name: 'detect', maxP95Ms: 250 },
    { name: 'decision', maxP95Ms: 250 },
    { name: 'appeals', maxP95Ms: 700 },
];
const DEFAULT_RISK_TIERS = [
    { name: 'critical', minScore: 0.9, action: 'ban', requiresHumanReview: true },
    { name: 'high', minScore: 0.75, action: 'restrict', requiresHumanReview: true },
    { name: 'medium', minScore: 0.5, action: 'age-gate', requiresHumanReview: false },
    { name: 'low', minScore: 0.25, action: 'warn', requiresHumanReview: false },
    { name: 'safe', minScore: 0, action: 'allow', requiresHumanReview: false },
];
const DEFAULT_CONFIG = {
    guardrails: DEFAULT_GUARDRAILS,
    residencyPolicies: [
        { region: 'us', storageRegion: 'us', allowExport: false },
        { region: 'eu', storageRegion: 'eu', allowExport: false },
    ],
    retention: { standardDays: 365, piiDays: 30, legalHoldEnabled: true },
    latencyBudgets: DEFAULT_LATENCY_BUDGETS,
    riskTiers: DEFAULT_RISK_TIERS,
    purposeTags: ['t&s', 'investigation', 'fraud-risk', 'research'],
    maxErrorRate: 0.05,
    syntheticProbeIntervalSeconds: 60,
    graphMotifCacheTtlSeconds: 300,
};
function buildAuditId() {
    return node_crypto_1.default.randomUUID();
}
function mergeConfigs(defaults, overrides) {
    if (!overrides) {
        return defaults;
    }
    return {
        guardrails: { ...defaults.guardrails, ...(overrides.guardrails ?? {}) },
        residencyPolicies: overrides.residencyPolicies ?? defaults.residencyPolicies,
        retention: { ...defaults.retention, ...(overrides.retention ?? {}) },
        latencyBudgets: overrides.latencyBudgets ?? defaults.latencyBudgets,
        riskTiers: overrides.riskTiers ?? defaults.riskTiers,
        purposeTags: overrides.purposeTags ?? defaults.purposeTags,
        maxErrorRate: overrides.maxErrorRate ?? defaults.maxErrorRate,
        syntheticProbeIntervalSeconds: overrides.syntheticProbeIntervalSeconds ?? defaults.syntheticProbeIntervalSeconds,
        graphMotifCacheTtlSeconds: overrides.graphMotifCacheTtlSeconds ?? defaults.graphMotifCacheTtlSeconds,
    };
}
function applyLaplaceNoise(value, epsilon) {
    const u = Math.random() - 0.5;
    const b = 1 / epsilon;
    return value - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
class TrustSafetyOrchestrator {
    config;
    backouts = new Map();
    auditLog = [];
    constructor(config) {
        this.config = mergeConfigs(DEFAULT_CONFIG, config);
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    backoutLane(lane, reason) {
        this.backouts.set(lane, { lane, reason, timestamp: new Date().toISOString() });
    }
    restoreLane(lane) {
        this.backouts.delete(lane);
    }
    firstLaneBackout(lanes) {
        for (const lane of lanes) {
            const backout = this.backouts.get(lane);
            if (backout) {
                return this.freezeAction(`Lane ${lane} backout: ${backout.reason}`, lane);
            }
        }
        return undefined;
    }
    evaluateGuardrails(metrics, purpose) {
        const violations = [];
        const guardrails = this.config.guardrails;
        if (metrics.apiReadP95Ms && metrics.apiReadP95Ms > guardrails.apiReadP95Ms) {
            violations.push({ category: 'latency', message: 'API read latency budget breached' });
        }
        if (metrics.apiWriteP95Ms && metrics.apiWriteP95Ms > guardrails.apiWriteP95Ms) {
            violations.push({ category: 'latency', message: 'API write latency budget breached' });
        }
        if (metrics.subscriptionP95Ms &&
            metrics.subscriptionP95Ms > guardrails.subscriptionP95Ms) {
            violations.push({ category: 'latency', message: 'Subscription latency budget breached' });
        }
        if (metrics.graphOneHopMs && metrics.graphOneHopMs > guardrails.graphOneHopMs) {
            violations.push({ category: 'latency', message: 'Graph 1-hop latency budget breached' });
        }
        if (metrics.graphMultiHopMs && metrics.graphMultiHopMs > guardrails.graphMultiHopMs) {
            violations.push({ category: 'latency', message: 'Graph 2-3 hop latency budget breached' });
        }
        if (metrics.ingestThroughputPerPod &&
            metrics.ingestThroughputPerPod < guardrails.ingestThroughputPerPod) {
            violations.push({ category: 'throughput', message: 'Ingest throughput below guarantee' });
        }
        if (metrics.ingestLatencyP95Ms && metrics.ingestLatencyP95Ms > guardrails.ingestLatencyP95Ms) {
            violations.push({ category: 'latency', message: 'Ingest latency budget breached' });
        }
        if (metrics.availability && metrics.availability < guardrails.availability) {
            violations.push({ category: 'availability', message: 'Availability below 99.9%' });
        }
        if (metrics.costPerKIngestUsd && metrics.costPerKIngestUsd > guardrails.costPerKIngestUsd) {
            violations.push({ category: 'cost', message: 'Ingest unit cost above $0.10 per 1k events' });
        }
        if (metrics.costPerMGraphqlUsd &&
            metrics.costPerMGraphqlUsd > guardrails.costPerMGraphqlUsd) {
            violations.push({ category: 'cost', message: 'GraphQL unit cost above $2 per 1M calls' });
        }
        if (metrics.errorRate && metrics.errorRate > this.config.maxErrorRate) {
            violations.push({ category: 'availability', message: 'Observed error rate breaches budget' });
        }
        if (purpose && !this.config.purposeTags.includes(purpose)) {
            violations.push({ category: 'purpose', message: `Purpose tag ${purpose} is not allowed` });
        }
        if (metrics.stageLatencies) {
            for (const budget of this.config.latencyBudgets) {
                const observed = metrics.stageLatencies[budget.name];
                if (observed && observed > budget.maxP95Ms) {
                    violations.push({
                        category: 'latency',
                        message: `Stage ${budget.name} latency budget breached`,
                    });
                }
            }
        }
        return { ok: violations.length === 0, violations };
    }
    ensureResidency(region) {
        const policy = this.config.residencyPolicies.find((entry) => entry.region === region);
        if (!policy) {
            throw new Error(`No residency policy for region ${region}`);
        }
        if (!policy.allowExport && policy.storageRegion !== region) {
            throw new Error(`Residency policy prohibits export from ${region}`);
        }
    }
    enforceRetention(days, isPii) {
        const allowedDays = isPii ? this.config.retention.piiDays : this.config.retention.standardDays;
        if (days > allowedDays && !this.config.retention.legalHoldEnabled) {
            throw new Error('Retention exceeds policy and legal hold is disabled');
        }
    }
    runPipeline(input, metrics = {}) {
        const laneFreeze = this.firstLaneBackout(['ingest', 'detection', 'decision']);
        if (laneFreeze) {
            return laneFreeze;
        }
        const guardrailEval = this.evaluateGuardrails(metrics, input.purpose);
        if (!guardrailEval.ok) {
            return this.freezeAction('Guardrail violation', 'decision');
        }
        this.ensureResidency(input.region);
        const retentionDays = input.retentionDays ??
            (input.containsPii ? this.config.retention.piiDays : this.config.retention.standardDays);
        this.enforceRetention(retentionDays, Boolean(input.containsPii ?? input.provenance?.uploader));
        const decisionContext = this.evaluateSignals(input);
        const riskTier = this.resolveRiskTier(decisionContext.signals);
        const enforcementFreeze = this.backouts.get('enforcement');
        if (enforcementFreeze) {
            return this.freezeAction(`Lane enforcement backout: ${enforcementFreeze.reason}`, 'enforcement', riskTier);
        }
        const action = this.buildAction(riskTier, decisionContext, input);
        this.auditLog.push(action);
        return action;
    }
    buildDifferentiallyPrivateCounts(counts, epsilon = 0.5) {
        const result = {};
        for (const [key, value] of Object.entries(counts)) {
            result[key] = Math.max(0, applyLaplaceNoise(value, epsilon));
        }
        return result;
    }
    cacheGraphMotifs(motifs) {
        const cache = new Map();
        const now = Date.now();
        motifs.forEach((motif, index) => {
            cache.set(motif, now + this.config.graphMotifCacheTtlSeconds * 1000 + index);
        });
        return cache;
    }
    scheduleSyntheticProbe() {
        const intervalMs = this.config.syntheticProbeIntervalSeconds * 1000;
        return setInterval(() => {
            const probe = {
                contentType: 'post',
                text: 'probe',
                region: 'us',
                purpose: 't&s',
            };
            this.runPipeline(probe);
        }, intervalMs);
    }
    stopSyntheticProbe(intervalId) {
        clearInterval(intervalId);
    }
    freezeAction(reason, lane, riskTier = 'safe') {
        const fullReason = `${reason};Tier=${riskTier}`;
        const action = {
            action: 'freeze',
            requiresHumanReview: true,
            reason: fullReason,
            riskTier,
            auditId: buildAuditId(),
            appliedRateLimit: false,
            isChildSafetyPriority: false,
        };
        this.auditLog.push(action);
        return action;
    }
    evaluateSignals(input) {
        const signals = {
            modelScore: clamp(input.signals?.modelScore ?? this.estimateModelScore(input), 0, 1),
            ruleScore: clamp(input.signals?.ruleScore ?? this.estimateRuleScore(input), 0, 1),
            childSafetyScore: clamp(input.signals?.childSafetyScore ?? 0, 0, 1),
            selfHarmScore: clamp(input.signals?.selfHarmScore ?? 0, 0, 1),
            spamScore: clamp(input.signals?.spamScore ?? 0, 0, 1),
            abuseScore: clamp(input.signals?.abuseScore ?? 0, 0, 1),
            velocityScore: clamp(input.signals?.velocityScore ?? 0, 0, 1),
            adversarialConfidence: clamp(input.signals?.adversarialConfidence ?? 0, 0, 1),
        };
        const adaptiveChoice = this.selectAdaptivePath(signals);
        const latencyPaths = {};
        for (const budget of this.config.latencyBudgets) {
            latencyPaths[budget.name] = budget.maxP95Ms;
        }
        return {
            signals,
            adaptiveChoice,
            latencyPaths,
            retainedPurpose: input.purpose,
        };
    }
    estimateModelScore(input) {
        const textLength = input.text?.length ?? 0;
        if (textLength === 0) {
            return 0.1;
        }
        const density = Math.min(1, textLength / 500);
        return 0.2 + 0.6 * density;
    }
    estimateRuleScore(input) {
        const hasMedia = Boolean(input.mediaHash);
        const ruleBias = hasMedia ? 0.4 : 0.2;
        const purposeBias = input.purpose === 'research' ? 0 : 0.1;
        return clamp(ruleBias + purposeBias, 0, 1);
    }
    selectAdaptivePath(signals) {
        if (signals.adversarialConfidence > 0.7) {
            return 'hybrid';
        }
        if (signals.velocityScore > 0.6 || signals.spamScore > 0.6) {
            return 'rule';
        }
        return 'ml';
    }
    resolveRiskTier(signals) {
        const composite = 0.3 * signals.modelScore +
            0.25 * signals.ruleScore +
            0.2 * signals.abuseScore +
            0.15 * signals.spamScore +
            0.1 * Math.max(signals.childSafetyScore, signals.selfHarmScore);
        const prioritizedScore = Math.max(composite, signals.childSafetyScore, signals.selfHarmScore);
        for (const tier of this.config.riskTiers) {
            if (prioritizedScore >= tier.minScore) {
                return tier.name;
            }
        }
        return 'safe';
    }
    buildAction(tier, decisionContext, input) {
        const tierConfig = this.config.riskTiers.find((entry) => entry.name === tier);
        if (!tierConfig) {
            throw new Error(`Unknown risk tier: ${tier}`);
        }
        const isChildSafetyPriority = decisionContext.signals.childSafetyScore >= 0.5 ||
            (input.userAge !== undefined && input.userAge < 18);
        const action = {
            action: tierConfig.action,
            requiresHumanReview: tierConfig.requiresHumanReview || isChildSafetyPriority,
            reason: this.buildReason(tier, decisionContext, input),
            riskTier: tier,
            auditId: buildAuditId(),
            appliedRateLimit: tier !== 'safe',
            isChildSafetyPriority,
        };
        if (tier === 'critical' || isChildSafetyPriority) {
            action.action = 'restrict';
        }
        return action;
    }
    buildReason(tier, decisionContext, input) {
        const parts = [
            `Tier=${tier}`,
            `path=${decisionContext.adaptiveChoice}`,
            `purpose=${decisionContext.retainedPurpose}`,
        ];
        if (decisionContext.signals.childSafetyScore >= 0.5) {
            parts.push('child-safety-priority');
        }
        if (decisionContext.signals.selfHarmScore >= 0.5) {
            parts.push('self-harm-safety');
        }
        if (input.purpose === 'research') {
            parts.push('research-sandbox');
        }
        return parts.join(';');
    }
}
exports.TrustSafetyOrchestrator = TrustSafetyOrchestrator;
exports.TRUST_SAFETY_DEFAULTS = DEFAULT_CONFIG;
