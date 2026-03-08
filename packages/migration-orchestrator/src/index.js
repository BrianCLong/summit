"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationOrchestrator = void 0;
const accounts_ts_1 = require("./accounts.ts");
const backfill_ts_1 = require("./backfill.ts");
const dashboard_ts_1 = require("./dashboard.ts");
const entitlements_ts_1 = require("./entitlements.ts");
const identity_ts_1 = require("./identity.ts");
const integrations_ts_1 = require("./integrations.ts");
const legal_ts_1 = require("./legal.ts");
const parity_ts_1 = require("./parity.ts");
const reliability_ts_1 = require("./reliability.ts");
const support_ts_1 = require("./support.ts");
const ux_ts_1 = require("./ux.ts");
class MigrationOrchestrator {
    constructor() {
        this.identity = new identity_ts_1.IdentityService();
        this.accountLinks = new accounts_ts_1.AccountLinkService();
        this.lifecycle = new accounts_ts_1.TenantLifecycle();
        this.entitlements = new entitlements_ts_1.EntitlementService();
        this.integrations = new integrations_ts_1.IntegrationService();
        this.ux = new ux_ts_1.UXParityService();
        this.reliability = new reliability_ts_1.ReliabilityManager();
        this.legal = new legal_ts_1.LegalCompliance();
        this.support = new support_ts_1.SupportManager();
        this.parityEngine = new parity_ts_1.ParityEngine();
    }
    dashboardBuilder() {
        const sources = {
            dataMappings: new Map(),
            parityEngine: this.parityEngine,
            lifecycle: this.lifecycle,
            accountLinks: this.accountLinks,
            entitlements: this.entitlements,
            integrations: this.integrations,
            ux: this.ux,
            reliability: this.reliability,
            support: this.support,
        };
        return new dashboard_ts_1.DashboardBuilder(sources);
    }
    backfill(maxRetries, batchSize) {
        return new backfill_ts_1.BackfillFramework(maxRetries, batchSize);
    }
}
exports.MigrationOrchestrator = MigrationOrchestrator;
