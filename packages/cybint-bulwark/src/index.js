"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceGuardrails = exports.InfrastructureHygieneManager = exports.IdentityTripwireFramework = exports.RapidResponseModernizer = exports.DetectionEngineeringService = exports.TelemetryUnifier = exports.TelemetryLake = void 0;
const crypto_1 = __importDefault(require("crypto"));
const yaml_1 = __importDefault(require("yaml"));
class TelemetryLake {
    views = new Map();
    constructor(viewNames) {
        viewNames.forEach(view => {
            this.views.set(view.name, { ...view, events: [] });
        });
    }
    pipe(event) {
        for (const view of this.views.values()) {
            if (view.allowedSensitivities.includes(event.resource.sensitivity)) {
                view.events.push(event);
            }
        }
    }
    getView(name) {
        return this.views.get(name);
    }
}
exports.TelemetryLake = TelemetryLake;
class TelemetryUnifier {
    lake;
    sources = new Map();
    constructor(lake) {
        this.lake = lake;
    }
    inventorySource(source) {
        this.sources.set(source.id, source);
    }
    normalize(event) {
        const source = this.sources.get(event.sourceId);
        if (!source) {
            throw new Error(`Unknown telemetry source ${event.sourceId}`);
        }
        const attributes = event.attributes ?? {};
        const body = { ...event.body };
        const missing = source.minimalFields.filter(field => !(field in body) && !(field in attributes));
        if (missing.length > 0) {
            throw new Error(`Missing minimal fields for ${source.id}: ${missing.join(', ')}`);
        }
        const classification = new Set(['telemetry', source.domain.toLowerCase()]);
        source.classificationTags?.forEach(tag => classification.add(tag));
        const normalized = {
            sourceId: source.id,
            domain: source.domain,
            timestamp: event.timestamp,
            severityText: 'INFO',
            body,
            attributes,
            resource: {
                schemaVersion: event.schemaVersion ?? '1.0',
                retentionDays: source.retentionDays,
                sensitivity: source.sensitivity,
                domain: source.domain
            },
            classification: Array.from(classification)
        };
        this.lake.pipe(normalized);
        this.sources.set(source.id, { ...source, lastSeen: event.timestamp });
        return normalized;
    }
    buildTrustScore(sourceId, validationRate, expectedEvents, receivedEvents) {
        const source = this.sources.get(sourceId);
        if (!source) {
            throw new Error(`Unknown telemetry source ${sourceId}`);
        }
        const freshness = this.calculateFreshnessScore(source);
        const completeness = expectedEvents === 0 ? 1 : Math.min(receivedEvents / expectedEvents, 1);
        const fidelity = Math.max(Math.min(validationRate, 1), 0);
        const overall = Number(((freshness * 0.4 + completeness * 0.35 + fidelity * 0.25)).toFixed(3));
        return { freshness, completeness, fidelity, overall };
    }
    detectDrift(event) {
        const source = this.sources.get(event.sourceId);
        if (!source) {
            throw new Error(`Unknown telemetry source ${event.sourceId}`);
        }
        const findings = [];
        const attributes = event.attributes ?? {};
        const bodyKeys = new Set(Object.keys(event.body));
        const attrKeys = new Set(Object.keys(attributes));
        const missingFields = source.minimalFields.filter(field => !bodyKeys.has(field) && !attrKeys.has(field));
        const unexpectedFields = Array.from(new Set([...bodyKeys, ...attrKeys])).filter(field => !source.minimalFields.includes(field));
        const fieldTypeMismatches = {};
        source.minimalFields.forEach(field => {
            const candidate = event.body[field] ?? attributes[field];
            if (candidate !== undefined) {
                if (typeof candidate === 'string' && candidate.trim() === '') {
                    fieldTypeMismatches[field] = 'empty-string';
                }
            }
        });
        if (missingFields.length || unexpectedFields.length || Object.keys(fieldTypeMismatches).length) {
            findings.push({ type: 'SCHEMA', missingFields, unexpectedFields, fieldTypeMismatches });
        }
        const suspiciousContent = [];
        Object.entries(event.body).forEach(([field, value]) => {
            if (typeof value === 'string' && value.toLowerCase().includes('drop table')) {
                suspiciousContent.push({ field, reason: 'sql-injection-linguistic-match' });
            }
            if (field.toLowerCase().includes('password')) {
                suspiciousContent.push({ field, reason: 'secret-in-body' });
            }
        });
        if (suspiciousContent.length) {
            findings.push({ type: 'CONTENT', suspiciousContent });
        }
        return findings;
    }
    calculateFreshnessScore(source) {
        if (!source.lastSeen)
            return 0;
        const now = Date.now();
        const deltaMinutes = (now - source.lastSeen.getTime()) / 60000;
        if (deltaMinutes <= source.freshnessSloMinutes)
            return 1;
        if (deltaMinutes > source.freshnessSloMinutes * 4)
            return 0;
        const decay = Math.max(0, 1 - deltaMinutes / (source.freshnessSloMinutes * 4));
        return Number(decay.toFixed(3));
    }
}
exports.TelemetryUnifier = TelemetryUnifier;
class DetectionEngineeringService {
    telemetry;
    constructor(telemetry) {
        this.telemetry = telemetry;
    }
    convertToSigma(rule) {
        const detection = {};
        rule.legacyConditions.forEach((condition, index) => {
            detection[`condition_${index}`] = {
                field: condition.field,
                operator: condition.operator,
                value: condition.value
            };
        });
        const sigmaDocument = {
            title: rule.name,
            id: rule.id,
            description: `${rule.name} auto-converted from legacy conditions`,
            status: 'experimental',
            logsource: {
                category: rule.telemetryDomains.join(',')
            },
            detection,
            fields: rule.legacyConditions.map(c => c.field),
            tags: ['bulwark', ...rule.tactics, `owner:${rule.owner}`, `renew:${rule.renewAt.toISOString()}`],
            falsepositives: ['validated by synthetic data harness'],
            level: 'medium'
        };
        return yaml_1.default.stringify(sigmaDocument);
    }
    prioritizeThreats(rules) {
        return [...rules].sort((a, b) => b.riskToOrg * b.detectionGap - a.riskToOrg * a.detectionGap);
    }
    clusterAlerts(alerts) {
        const clusters = new Map();
        alerts.forEach(alert => {
            const key = `${alert.campaign ?? 'unknown'}:${alert.tactic}`;
            clusters.set(key, (clusters.get(key) ?? 0) + 1);
        });
        return clusters;
    }
    validateWithSyntheticData(rule, syntheticEvents) {
        let triggered = 0;
        let falsePositives = 0;
        let falseNegatives = 0;
        const evalCondition = (event, condition) => {
            const haystack = event.body[condition.field] ?? event.attributes?.[condition.field];
            if (haystack === undefined)
                return false;
            switch (condition.operator) {
                case 'equals':
                    return haystack === condition.value;
                case 'contains':
                    return typeof haystack === 'string' && haystack.includes(String(condition.value));
                case 'gt':
                    return typeof haystack === 'number' && haystack > Number(condition.value);
                case 'lt':
                    return typeof haystack === 'number' && haystack < Number(condition.value);
                default:
                    return false;
            }
        };
        syntheticEvents.forEach(event => {
            const matches = rule.legacyConditions.every(condition => evalCondition(event, condition));
            const shouldTrigger = Boolean(event.body.expectedAlert);
            if (matches) {
                triggered += 1;
                if (!shouldTrigger)
                    falsePositives += 1;
            }
            else if (shouldTrigger) {
                falseNegatives += 1;
            }
        });
        let health = 0;
        const sourceId = syntheticEvents[0]?.sourceId;
        if (sourceId) {
            try {
                health = this.telemetry.buildTrustScore(sourceId, 0.95, syntheticEvents.length, syntheticEvents.length).overall;
            }
            catch {
                health = 0;
            }
        }
        return { ruleId: rule.id, triggered, falsePositives, falseNegatives, telemetryHealthCorrelation: health };
    }
    buildCoverageHeatmap(rules) {
        const heatmap = new Map();
        rules.forEach(rule => {
            rule.tactics.forEach(tactic => {
                heatmap.set(tactic, (heatmap.get(tactic) ?? 0) + 1);
            });
        });
        return heatmap;
    }
}
exports.DetectionEngineeringService = DetectionEngineeringService;
class RapidResponseModernizer {
    playbooks = new Map();
    custodyLog = [];
    isolationState = new Map();
    createPlaybook(alertName, actions) {
        if (!actions.some(a => a.containmentFirst)) {
            throw new Error('Playbook must include at least one containment-first action');
        }
        this.playbooks.set(alertName, actions);
    }
    execute(alertName, assetId) {
        const actions = this.playbooks.get(alertName);
        if (!actions)
            throw new Error(`No playbook for ${alertName}`);
        actions
            .filter(action => action.containmentFirst)
            .forEach(action => {
            this.isolationState.set(assetId, { isolated: true, reason: action.name });
        });
        return actions;
    }
    appendEvidence(action, actor, details) {
        const previousHash = this.custodyLog[this.custodyLog.length - 1]?.hash ?? '';
        const payload = `${previousHash}${action}${actor}${JSON.stringify(details)}`;
        const hash = crypto_1.default.createHash('sha256').update(payload).digest('hex');
        const entry = {
            id: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            action,
            actor,
            details,
            previousHash,
            hash
        };
        this.custodyLog.push(entry);
        return entry;
    }
    verifyChainOfCustody() {
        for (let i = 0; i < this.custodyLog.length; i += 1) {
            const entry = this.custodyLog[i];
            const expectedPayload = `${entry.previousHash}${entry.action}${entry.actor}${JSON.stringify(entry.details)}`;
            const expectedHash = crypto_1.default.createHash('sha256').update(expectedPayload).digest('hex');
            if (entry.hash !== expectedHash)
                return false;
            if (i > 0 && this.custodyLog[i - 1].hash !== entry.previousHash)
                return false;
        }
        return true;
    }
    metrics(ttd, ttr, mttr) {
        const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
        return { ttd: average(ttd), ttr: average(ttr), mttr: average(mttr) };
    }
    readinessTripwire(lastRun, now = new Date()) {
        const deltaDays = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24);
        return deltaDays <= 30;
    }
}
exports.RapidResponseModernizer = RapidResponseModernizer;
class IdentityTripwireFramework {
    accounts = new Map();
    honeytokens = new Set();
    eventLog = [];
    registerAccount(profile) {
        if (!profile.mfaEnforced) {
            throw new Error('MFA is mandatory for all accounts');
        }
        this.accounts.set(profile.id, profile);
    }
    insertHoneytoken(accountId) {
        this.honeytokens.add(accountId);
    }
    logEvent(event) {
        const enriched = {
            ...event,
            riskScore: this.scoreRisk(event),
            honeytoken: this.honeytokens.has(event.actor)
        };
        this.eventLog.push(enriched);
        return enriched;
    }
    scoreRisk(event) {
        let score = 0.2;
        if (event.action.includes('admin') || event.action.includes('elevate'))
            score += 0.4;
        if (event.location && event.location !== 'trusted')
            score += 0.2;
        if (!event.justification)
            score += 0.2;
        if (this.honeytokens.has(event.actor))
            score += 1;
        return Math.min(score, 1);
    }
    riskBasedSessionScore(accountId) {
        const recentEvents = this.eventLog.filter(event => event.actor === accountId).slice(-5);
        if (!recentEvents.length)
            return 0;
        const avg = recentEvents.reduce((sum, e) => sum + (e.riskScore ?? 0), 0) / recentEvents.length;
        return Number(avg.toFixed(2));
    }
}
exports.IdentityTripwireFramework = IdentityTripwireFramework;
class InfrastructureHygieneManager {
    assets = new Map();
    secrets = [];
    orphanedResources = new Set();
    registerAsset(asset) {
        this.assets.set(asset.id, asset);
    }
    scanExpirations(now = new Date()) {
        const deactivated = [];
        for (const [id, asset] of this.assets.entries()) {
            if (asset.expiration.getTime() < now.getTime() && asset.active) {
                this.assets.set(id, { ...asset, active: false });
                deactivated.push(id);
            }
        }
        return deactivated;
    }
    enforceBaseline(assetId, desired) {
        const asset = this.assets.get(assetId);
        if (!asset)
            throw new Error('Unknown asset');
        const drift = Object.entries(desired).some(([key, value]) => asset.baselineConfig[key] !== value);
        if (drift) {
            this.assets.set(assetId, { ...asset, baselineConfig: { ...desired } });
        }
        return drift;
    }
    inventorySecrets(payload) {
        const findings = [];
        const secretRegex = /(AKIA[0-9A-Z]{16})|(secret_key\s*=\s*['\"]?[A-Za-z0-9]{16,})/g;
        let match;
        while ((match = secretRegex.exec(payload)) !== null) {
            const secret = match[0];
            this.secrets.push(secret);
            findings.push(secret);
        }
        return findings;
    }
    verifyAttestation(artifact) {
        return artifact.sbom && artifact.signatureValid && artifact.slsaLevel >= 3;
    }
    reclaimOrphans(orphanIds) {
        orphanIds.forEach(id => this.orphanedResources.add(id));
    }
    getOrphans() {
        return Array.from(this.orphanedResources);
    }
}
exports.InfrastructureHygieneManager = InfrastructureHygieneManager;
class GovernanceGuardrails {
    policies = [];
    exceptions = new Map();
    riskMapping = new Map();
    registerPolicy(name, evaluator) {
        this.policies.push(input => ({ policy: name, allowed: evaluator(input), reason: evaluator(input) ? 'ok' : 'deny-by-default' }));
    }
    evaluate(input) {
        return this.policies.map(policy => policy(input));
    }
    addException(record) {
        this.exceptions.set(record.id, record);
    }
    sweepExpired(now = new Date()) {
        const expired = [];
        for (const [id, exception] of this.exceptions.entries()) {
            if (exception.expiresAt.getTime() < now.getTime()) {
                this.exceptions.delete(id);
                expired.push(id);
            }
        }
        return expired;
    }
    mapRiskToControl(risk, control) {
        this.riskMapping.set(risk, control);
    }
    controlScoreboard(alertFidelity) {
        const coverage = this.policies.length ? Math.min(1, this.policies.length / 10) : 0;
        const riskDelta = this.riskMapping.size * 0.05;
        return { coverage: Number(coverage.toFixed(2)), riskDelta: Number(riskDelta.toFixed(2)), alertFidelity };
    }
}
exports.GovernanceGuardrails = GovernanceGuardrails;
