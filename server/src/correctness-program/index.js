"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctnessProgram = exports.CorrectnessProgram = void 0;
const adminTools_js_1 = require("./adminTools.js");
const eventContracts_js_1 = require("./eventContracts.js");
const governance_js_1 = require("./governance.js");
const invariants_js_1 = require("./invariants.js");
const migrationFactory_js_1 = require("./migrationFactory.js");
const observability_js_1 = require("./observability.js");
const reconciliation_js_1 = require("./reconciliation.js");
const domain_js_1 = require("./domain.js");
class CorrectnessProgram {
    truthMap = new domain_js_1.TruthMapRegistry();
    invariants = new invariants_js_1.InvariantRegistry();
    reconciliation = new reconciliation_js_1.ReconciliationEngine();
    migrations = new migrationFactory_js_1.MigrationFactory();
    eventContracts = new eventContracts_js_1.EventContractRegistry();
    timeline = new observability_js_1.RecordTimeline();
    adminRepairs = new adminTools_js_1.AdminRepairService();
    governance = new governance_js_1.GovernanceTracker();
    bootstrapDefaultDomains() {
        const defaults = [
            {
                domain: 'customer',
                policy: {
                    canonicalIdField: 'customerId',
                    mergePolicy: 'prefer_newest',
                    splitPolicy: 'manual_review',
                    resolutionRules: ['email normalized', 'oidc subject wins when present'],
                },
                writers: ['customer-api'],
                readers: ['customer-api', 'reporting'],
            },
            {
                domain: 'billing',
                policy: {
                    canonicalIdField: 'invoiceId',
                    mergePolicy: 'manual_review',
                    splitPolicy: 'manual_review',
                    resolutionRules: ['ledger entry id is canonical', 'entitlement must exist'],
                },
                writers: ['billing-writer'],
                readers: ['billing-reader', 'reporting'],
            },
            {
                domain: 'permissions',
                policy: {
                    canonicalIdField: 'subjectId',
                    mergePolicy: 'prefer_newest',
                    splitPolicy: 'manual_review',
                    resolutionRules: ['subject must match identity provider', 'role dedupe per tenant'],
                },
                writers: ['rbac-service'],
                readers: ['rbac-service', 'edge'],
            },
        ];
        defaults.forEach(({ domain, policy, writers, readers }) => {
            const entry = {
                domain,
                systemOfRecord: domain_js_1.defaultTruthSources[domain],
                writers: writers.map((name) => ({ name, kind: 'service' })),
                readers: readers.map((name) => ({ name, kind: 'service' })),
                caches: [
                    {
                        name: `${domain}-cache`,
                        kind: 'cache',
                        guards: ['ttl'],
                    },
                ],
                syncPaths: [
                    { from: domain_js_1.defaultTruthSources[domain].name, to: `${domain}-cache`, cadence: '5m', guardedBy: ['checksum'] },
                ],
            };
            this.truthMap.declareDomain(entry, policy);
        });
        this.invariants.registerStateMachine((0, invariants_js_1.buildBooleanStateMachine)('customer-active', 'customer', 'active', 'inactive'));
    }
    declareDriftPair(pair) {
        this.reconciliation.registerPair(pair);
    }
    registerEventSchema(schema) {
        this.eventContracts.registerSchema(schema);
    }
    startMigration(manifest, total) {
        return this.migrations.start(manifest, total);
    }
    buildMigrationManifest(domain, scope) {
        return (0, migrationFactory_js_1.buildManifest)(domain, scope);
    }
}
exports.CorrectnessProgram = CorrectnessProgram;
exports.correctnessProgram = new CorrectnessProgram();
exports.correctnessProgram.bootstrapDefaultDomains();
// Export the enhanced agent coordination service
// export { AgentCoordinationService, agentCoordinationService } from './agent-coordination.js';
