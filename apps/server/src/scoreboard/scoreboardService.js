"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreboardService = exports.ScoreboardService = void 0;
const exceptionRegistry_js_1 = require("./exceptionRegistry.js");
const decisionLog_js_1 = require("./decisionLog.js");
const releaseEnvelopeRegistry_js_1 = require("./releaseEnvelopeRegistry.js");
const types_js_1 = require("./types.js");
const clampZero = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
class ScoreboardService {
    scoreboards = new Map();
    exceptions = new exceptionRegistry_js_1.ExceptionRegistry();
    decisions = new decisionLog_js_1.DecisionLog();
    releaseEnvelopes = new releaseEnvelopeRegistry_js_1.ReleaseEnvelopeRegistry();
    upsertDomainMetrics(input) {
        this.validateMetrics(input);
        const metrics = {
            ...input,
            sloBurnRate: clampZero(input.sloBurnRate),
            errorBudgetRemaining: clampZero(input.errorBudgetRemaining),
            cycleTimeDays: clampZero(input.cycleTimeDays),
            wipCount: clampZero(input.wipCount),
            wipLimit: clampZero(input.wipLimit),
            blockedTimeHours: clampZero(input.blockedTimeHours),
            reworkRate: clampZero(input.reworkRate),
            costPerUnit: clampZero(input.costPerUnit),
            deletionShipped: clampZero(input.deletionShipped),
            debtBurn: clampZero(input.debtBurn),
            repeatIncidents: clampZero(input.repeatIncidents),
            prSizeLimitBreaches: clampZero(input.prSizeLimitBreaches),
        };
        this.scoreboards.set(input.domainId, { metrics });
        return this.getDomainScoreboard(input.domainId);
    }
    reset() {
        this.scoreboards.clear();
        this.exceptions = new exceptionRegistry_js_1.ExceptionRegistry();
        this.decisions = new decisionLog_js_1.DecisionLog();
        this.releaseEnvelopes = new releaseEnvelopeRegistry_js_1.ReleaseEnvelopeRegistry();
    }
    getDomainScoreboard(domainId) {
        const record = this.scoreboards.get(domainId);
        if (!record)
            return undefined;
        const gates = this.evaluateGates(record.metrics);
        const decisions = this.decisions.list(domainId);
        const exceptions = this.exceptions.listByDomain(domainId);
        const releaseEnvelope = this.releaseEnvelopes.get(domainId);
        return {
            domainId,
            domainName: record.metrics.domainName,
            metrics: record.metrics,
            gates,
            decisions,
            exceptions,
            releaseEnvelope,
            health: this.computeHealth(record.metrics),
        };
    }
    listScoreboards() {
        return Array.from(this.scoreboards.keys())
            .map((domainId) => this.getDomainScoreboard(domainId))
            .filter((scoreboard) => Boolean(scoreboard));
    }
    registerException(params) {
        return this.exceptions.registerException(params);
    }
    logDecision(params) {
        return this.decisions.log(params);
    }
    registerReleaseEnvelope(params) {
        return this.releaseEnvelopes.register(params);
    }
    computeHealth(metrics) {
        const reliability = metrics.errorBudgetRemaining <= types_js_1.HEALTH_THRESHOLDS.errorBudgetRemaining ||
            metrics.repeatIncidents > types_js_1.HEALTH_THRESHOLDS.repeatIncidents
            ? 'POOR'
            : metrics.errorBudgetRemaining < types_js_1.HEALTH_THRESHOLDS.errorBudgetRemaining * 3
                ? 'WATCH'
                : 'GOOD';
        const flow = metrics.wipCount > metrics.wipLimit ||
            metrics.blockedTimeHours > types_js_1.HEALTH_THRESHOLDS.blockedTimeHours ||
            metrics.reworkRate > types_js_1.HEALTH_THRESHOLDS.reworkRate
            ? 'POOR'
            : metrics.cycleTimeDays > types_js_1.HEALTH_THRESHOLDS.cycleTimeDays
                ? 'WATCH'
                : 'GOOD';
        const onCall = metrics.onCall.pagesPerShift > 6 || metrics.onCall.sleepDebtHours > 12
            ? 'POOR'
            : metrics.onCall.pagesPerShift > 3 || metrics.onCall.sleepDebtHours > 6
                ? 'WATCH'
                : 'GOOD';
        return { reliability, flow, onCall };
    }
    evaluateGates(metrics) {
        const gates = [];
        gates.push(this.evaluateRoadmapGate(metrics));
        gates.push(this.evaluateReleaseEnvelopeGate(metrics));
        gates.push(this.evaluatePrSizeGate(metrics));
        gates.push(this.evaluateWipGate(metrics));
        return gates;
    }
    evaluateRoadmapGate(metrics) {
        const override = this.exceptions.getActive(metrics.domainId, 'ROADMAP_SCOPE');
        const blocked = metrics.errorBudgetRemaining <= types_js_1.HEALTH_THRESHOLDS.errorBudgetRemaining ||
            metrics.repeatIncidents > types_js_1.HEALTH_THRESHOLDS.repeatIncidents;
        return {
            gate: 'ROADMAP_SCOPE',
            state: override ? 'OVERRIDDEN' : (blocked ? 'BLOCKED' : 'OPEN'),
            reason: blocked
                ? 'Error budget depleted or repeat incidents exceed threshold; roadmap scope gated.'
                : 'Error budget healthy; roadmap scope open.',
            ownerOverride: override?.owner,
            expiresAt: override?.expiresAt,
        };
    }
    evaluateReleaseEnvelopeGate(metrics) {
        const override = this.exceptions.getActive(metrics.domainId, 'RELEASE_ENVELOPE');
        const envelope = this.releaseEnvelopes.get(metrics.domainId);
        const blocked = metrics.releaseEnvelopeRequired && !envelope;
        return {
            gate: 'RELEASE_ENVELOPE',
            state: override ? 'OVERRIDDEN' : (blocked ? 'BLOCKED' : 'OPEN'),
            reason: blocked
                ? 'Release envelope required for Tier 0/1 scope but none is registered.'
                : 'Release envelope requirements satisfied.',
            ownerOverride: override?.owner,
            expiresAt: override?.expiresAt,
        };
    }
    evaluatePrSizeGate(metrics) {
        const override = this.exceptions.getActive(metrics.domainId, 'PR_SIZE_LIMIT');
        const blocked = metrics.prSizeLimitBreaches > types_js_1.HEALTH_THRESHOLDS.prSizeLimitBreaches;
        return {
            gate: 'PR_SIZE_LIMIT',
            state: override ? 'OVERRIDDEN' : (blocked ? 'BLOCKED' : 'OPEN'),
            reason: blocked
                ? 'PR size limits breached; tighten review rotations before merging further scope.'
                : 'PR size policy respected.',
            ownerOverride: override?.owner,
            expiresAt: override?.expiresAt,
        };
    }
    evaluateWipGate(metrics) {
        const override = this.exceptions.getActive(metrics.domainId, 'WIP_LIMIT');
        const blocked = metrics.wipCount > metrics.wipLimit;
        return {
            gate: 'WIP_LIMIT',
            state: override ? 'OVERRIDDEN' : (blocked ? 'BLOCKED' : 'OPEN'),
            reason: blocked ? 'WIP limit exceeded; stop starting and start finishing.' : 'WIP within limits.',
            ownerOverride: override?.owner,
            expiresAt: override?.expiresAt,
        };
    }
    validateMetrics(metrics) {
        const requiredStrings = ['domainId', 'domainName', 'periodStart', 'periodEnd'];
        requiredStrings.forEach((field) => {
            if (!metrics[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        });
        if (metrics.wipLimit <= 0) {
            throw new Error('WIP limit must be greater than zero to enforce gates.');
        }
        if (metrics.errorBudgetRemaining > 1 || metrics.errorBudgetRemaining < 0) {
            throw new Error('errorBudgetRemaining must be expressed as a value between 0 and 1.');
        }
        if (metrics.reworkRate < 0 || metrics.reworkRate > 1) {
            throw new Error('reworkRate must be expressed as a value between 0 and 1.');
        }
        if (metrics.sloBurnRate < 0 || metrics.sloBurnRate > 1) {
            throw new Error('sloBurnRate must be expressed as a value between 0 and 1.');
        }
    }
}
exports.ScoreboardService = ScoreboardService;
exports.scoreboardService = new ScoreboardService();
