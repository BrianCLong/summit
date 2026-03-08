"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractRegistry = void 0;
const spec_utils_js_1 = require("./spec-utils.js");
class ContractRegistry {
    workflow;
    audit;
    quarantine;
    scorecardsEngine;
    specs = new Map();
    certificates = new Map();
    scorecards = new Map();
    constructor(workflow, audit, quarantine, scorecardsEngine) {
        this.workflow = workflow;
        this.audit = audit;
        this.quarantine = quarantine;
        this.scorecardsEngine = scorecardsEngine;
    }
    register(spec) {
        const record = {
            ...spec,
            createdAt: spec.createdAt ?? new Date().toISOString(),
            status: spec.status ?? 'draft',
        };
        this.specs.set(spec.id, record);
        this.audit.record({ actor: 'registry', action: 'registered', details: { id: spec.id, version: spec.version } });
    }
    update(spec) {
        const previous = this.specs.get(spec.id);
        this.register(spec);
        if (!previous) {
            return ['new spec registered'];
        }
        const drift = (0, spec_utils_js_1.diffSpecs)(previous, spec);
        if (drift.length > 0) {
            this.audit.record({ actor: 'registry', action: 'drift-detected', details: { id: spec.id, drift } });
        }
        return drift;
    }
    get(contractId) {
        return this.specs.get(contractId);
    }
    async certify(contractId, secret, validUntil) {
        const spec = this.get(contractId);
        if (!spec) {
            return undefined;
        }
        const certificate = await this.workflow.issueCertificate(spec, secret, validUntil);
        this.certificates.set(contractId, certificate);
        spec.status = 'certified';
        this.audit.record({ actor: 'registry', action: 'certified', details: { id: contractId, certificateId: certificate.id } });
        return certificate;
    }
    getCertificate(contractId) {
        return this.certificates.get(contractId);
    }
    async validateIngestion(contractId, payload, environment, secret, providedCertificate) {
        const spec = this.get(contractId);
        if (!spec) {
            return {
                status: 'rejected',
                reason: `Unknown contract ${contractId}`,
                conformance: {
                    conforms: false,
                    missingFields: [],
                    nullabilityViolations: [],
                    typeViolations: [],
                    score: 0,
                    piiFlagsValid: false,
                    dpFlagsValid: false,
                },
                certificateVerified: false,
            };
        }
        const conformance = (0, spec_utils_js_1.validateConformance)(spec, payload);
        const certificate = providedCertificate ?? this.getCertificate(contractId);
        const verification = certificate
            ? await this.workflow.verifyCertificate(spec, certificate, secret)
            : { certificate: undefined, verified: false };
        if (environment === 'production' && !verification.verified) {
            this.audit.record({ actor: 'ingestion', action: 'blocked-no-cert', details: { contractId } });
            return {
                status: 'rejected',
                reason: 'Production ingestion requires a verified certificate',
                conformance,
                certificateVerified: false,
            };
        }
        if (!conformance.conforms) {
            const quarantineRecord = this.quarantine.place(contractId, 'contract-nonconformance', payload);
            this.audit.record({ actor: 'ingestion', action: 'quarantined', details: { contractId, issues: conformance } });
            return {
                status: 'quarantined',
                reason: 'Payload did not conform to contract',
                conformance,
                certificateVerified: verification.verified,
                quarantineRecord,
            };
        }
        this.audit.record({ actor: 'ingestion', action: 'accepted', details: { contractId, environment } });
        this.scorecards.set(contractId, this.scorecardsEngine.build({
            contractId,
            version: spec.version,
            conformanceScores: [conformance.score],
            quarantinedEvents: 0,
        }));
        return {
            status: 'accepted',
            conformance,
            certificateVerified: verification.verified,
        };
    }
    recertifyAfterResolution(contractId, secret) {
        const spec = this.get(contractId);
        if (!spec) {
            return Promise.resolve(undefined);
        }
        spec.status = 'certified';
        return this.certify(contractId, secret);
    }
    getScorecard(contractId) {
        return this.scorecards.get(contractId);
    }
}
exports.ContractRegistry = ContractRegistry;
