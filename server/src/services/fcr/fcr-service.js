"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcrService = void 0;
const schema_validator_js_1 = require("./schema-validator.js");
const privacy_budget_service_js_1 = require("./privacy-budget-service.js");
const credential_scorer_js_1 = require("./credential-scorer.js");
const clustering_service_js_1 = require("./clustering-service.js");
const early_warning_service_js_1 = require("./early-warning-service.js");
const response_pack_service_js_1 = require("./response-pack-service.js");
const fcr_ledger_js_1 = require("../../provenance/fcr-ledger.js");
class FcrService {
    validator = new schema_validator_js_1.FcrSchemaValidator();
    privacyBudget = new privacy_budget_service_js_1.FcrPrivacyBudgetService();
    scorer = new credential_scorer_js_1.FcrCredentialScorer();
    clustering = new clustering_service_js_1.FcrClusteringService();
    warning = new early_warning_service_js_1.FcrEarlyWarningService();
    responsePack = new response_pack_service_js_1.FcrResponsePackService();
    configureTenantBudget(tenantId, epsilon, delta) {
        this.privacyBudget.configureTenantBudget(tenantId, { epsilon, delta });
    }
    async ingestSignals(tenantId, signals) {
        if (signals.length === 0) {
            return { ok: false, errors: ['Signals payload is empty.'] };
        }
        const validation = await this.validator.validateSignals(signals);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors };
        }
        const mismatchedSignals = signals.filter((signal) => signal.tenant_id !== tenantId);
        if (mismatchedSignals.length > 0) {
            return {
                ok: false,
                errors: ['Signal tenant_id does not match request tenant_id.'],
            };
        }
        const totalCost = signals.reduce((acc, signal) => ({
            epsilon: acc.epsilon + signal.privacy_budget_cost.epsilon,
            delta: acc.delta + signal.privacy_budget_cost.delta,
        }), { epsilon: 0, delta: 0 });
        const budgetResult = this.privacyBudget.consume(tenantId, totalCost);
        if (!budgetResult.ok) {
            return {
                ok: false,
                errors: ['Privacy budget exceeded for one or more signals.'],
            };
        }
        const scored = signals.map((signal) => ({
            ...signal,
            confidence_local: this.scorer.scoreSignal(signal).score,
        }));
        await (0, fcr_ledger_js_1.recordFcrIngest)(tenantId, scored);
        return { ok: true, signals: scored };
    }
    async clusterSignals(tenantId, signals) {
        const clusters = this.clustering.clusterSignals(signals);
        await (0, fcr_ledger_js_1.recordFcrClusters)(tenantId, clusters);
        return clusters;
    }
    async generateAlerts(tenantId, clusters) {
        const alerts = this.warning.evaluateClusters(clusters).map((alert) => ({
            ...alert,
            response_pack: this.responsePack.buildResponsePack(alert),
        }));
        await (0, fcr_ledger_js_1.recordFcrAlert)(tenantId, alerts);
        return alerts;
    }
    async runPipeline(tenantId, signals) {
        const ingestResult = await this.ingestSignals(tenantId, signals);
        if (!ingestResult.ok) {
            return ingestResult;
        }
        const clusters = await this.clusterSignals(tenantId, ingestResult.signals);
        const alerts = await this.generateAlerts(tenantId, clusters);
        return {
            ok: true,
            clusters,
            alerts,
        };
    }
}
exports.FcrService = FcrService;
