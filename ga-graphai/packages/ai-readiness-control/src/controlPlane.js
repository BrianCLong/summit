"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIReadinessControlPlane = void 0;
const dataQuality_js_1 = require("./dataQuality.js");
const featureStore_js_1 = require("./featureStore.js");
const modelRegistry_js_1 = require("./modelRegistry.js");
const pii_js_1 = require("./pii.js");
const provenance_js_1 = require("./provenance.js");
const retrievalIndex_js_1 = require("./retrievalIndex.js");
const telemetry_js_1 = require("./telemetry.js");
const schemaRegistry_js_1 = require("./schemaRegistry.js");
const policyEngine_js_1 = require("./policyEngine.js");
class AIReadinessControlPlane {
    schemas = new schemaRegistry_js_1.SchemaRegistry();
    telemetry;
    gate;
    retrieval = new retrievalIndex_js_1.RetrievalIndex();
    features = new featureStore_js_1.FeatureStore();
    piiGuard;
    provenance = new provenance_js_1.ProvenanceTracker();
    models = new modelRegistry_js_1.ModelRegistry();
    policyEngine = new policyEngine_js_1.PolicyEngine(policyEngine_js_1.defaultPolicyProfiles);
    constructor(config, bus = new telemetry_js_1.InMemoryEventBus()) {
        this.telemetry = new telemetry_js_1.IntentTelemetry(bus);
        this.gate = new dataQuality_js_1.DataQualityGate(config.alertSink);
        this.piiGuard = new pii_js_1.PiiGuard(config.piiRules);
    }
    registerSchema(definition) {
        this.schemas.register(definition);
    }
    logIntent(event) {
        this.telemetry.log(event);
    }
    validateAndSanitize(entity, record) {
        const validation = this.schemas.validate(entity, record);
        const piiTags = this.piiGuard.tag(record);
        const redacted = this.piiGuard.redact(record);
        return { validated: validation.valid, redacted, errors: validation.errors, piiTags };
    }
    enforceDataQuality(table, records, options) {
        return this.gate.evaluate(table, records, options);
    }
    indexDocument(doc) {
        this.retrieval.add({ ...doc });
    }
    documentsNeedingRefresh(now) {
        return this.retrieval.dueForRefresh(now);
    }
    recordFeature(entry) {
        this.features.upsert(entry);
    }
    fetchFeature(key) {
        return this.features.get(key);
    }
    scheduleBackfill(job) {
        return this.features.backfill(job);
    }
    trackProvenance(record) {
        this.provenance.record(record);
    }
    attachFeedback(outputId, feedback) {
        this.provenance.attachFeedback(outputId, feedback);
    }
    recordModel(model) {
        this.models.register(model);
    }
    rollbackModel(modelId, version, reason) {
        this.models.rollback(modelId, version, reason);
    }
    evaluatePolicy(input) {
        return this.policyEngine.evaluate(input);
    }
    listPolicyAudits() {
        return this.policyEngine.listAudits();
    }
    updatePolicyProfile(name, updater) {
        return this.policyEngine.updateProfile(name, updater);
    }
    snapshot() {
        return {
            models: this.models.list(),
            provenance: this.provenance.list(),
            pendingFeatures: this.features.pendingExpiry(30),
        };
    }
}
exports.AIReadinessControlPlane = AIReadinessControlPlane;
