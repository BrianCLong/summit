"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceAuthority = void 0;
const DataLineageSystem_js_1 = require("./DataLineageSystem.js");
const RetentionPolicyEngine_js_1 = require("./RetentionPolicyEngine.js");
const SchemaDriftDetector_js_1 = require("./SchemaDriftDetector.js");
const AuditCompactor_js_1 = require("./AuditCompactor.js");
/**
 * Facade for the Data Governance Authority subsystem.
 */
class GovernanceAuthority {
    static instance;
    lineage;
    retention;
    drift;
    compactor;
    constructor() {
        this.lineage = DataLineageSystem_js_1.DataLineageSystem.getInstance();
        this.retention = RetentionPolicyEngine_js_1.RetentionPolicyEngine.getInstance();
        this.drift = SchemaDriftDetector_js_1.SchemaDriftDetector.getInstance();
        this.compactor = AuditCompactor_js_1.AuditCompactor.getInstance();
    }
    static getInstance() {
        if (!GovernanceAuthority.instance) {
            GovernanceAuthority.instance = new GovernanceAuthority();
        }
        return GovernanceAuthority.instance;
    }
    async runDailyGovernanceTasks() {
        console.log('Running daily governance tasks...');
        // 1. Enforce retention
        await this.retention.enforcePolicies();
        // 2. Compact old logs (e.g. older than 1 year, but for demo maybe 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        await this.compactor.compactLogs(ninetyDaysAgo);
        console.log('Governance tasks completed.');
    }
}
exports.GovernanceAuthority = GovernanceAuthority;
