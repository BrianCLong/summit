"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceBundleValidator = void 0;
exports.hashBundle = hashBundle;
const node_crypto_1 = require("node:crypto");
const data_integrity_1 = require("@ga-graphai/data-integrity");
const manifest_js_1 = require("./manifest.js");
class ProvenanceBundleValidator {
    validator;
    now;
    complianceFramework;
    attestor;
    custodyLocation;
    constructor(validator, options = {}) {
        this.validator = validator;
        this.now = options.now ?? (() => new Date());
        this.complianceFramework = options.complianceFramework ?? 'SOC2';
        this.attestor = options.attestor ?? validator.name;
        this.custodyLocation = options.custodyLocation;
    }
    async validate(bundle, manifest) {
        const custodyTrail = [
            this.buildCustodyEvent('received', 'prov-ledger'),
        ];
        const manifestVerification = (0, manifest_js_1.verifyManifest)(manifest, bundle.entries, {
            evidence: bundle,
        });
        const payload = {
            bundleHash: hashBundle(bundle),
            evidenceCount: bundle.entries.length,
            manifest,
        };
        custodyTrail.push(this.buildCustodyEvent('submitted', this.validator.name, 'Submitted for independent verification'));
        const thirdParty = await this.safeVerify(payload);
        custodyTrail.push(this.buildCustodyEvent('verified', this.validator.name, `status=${thirdParty.status}`));
        const compliance = this.buildComplianceAttestation(payload.bundleHash, manifestVerification.valid && thirdParty.status === 'verified', thirdParty.notes);
        custodyTrail.push(this.buildCustodyEvent('attested', compliance.attestedBy, compliance.status));
        return { manifestVerification, thirdParty, compliance, custodyTrail };
    }
    buildComplianceAttestation(evidenceRef, success, notes) {
        return {
            framework: this.complianceFramework,
            attestedBy: this.attestor,
            status: success ? 'compliant' : 'non-compliant',
            issuedAt: this.now().toISOString(),
            evidenceRef,
            controlsTested: ['integrity', 'traceability', 'immutability'],
            notes,
        };
    }
    buildCustodyEvent(stage, actor, notes) {
        return {
            stage,
            actor,
            timestamp: this.now().toISOString(),
            location: this.custodyLocation,
            notes,
        };
    }
    async safeVerify(payload) {
        try {
            return await this.validator.verify(payload);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown validator failure';
            return {
                validator: this.validator.name,
                status: 'error',
                correlationId: (0, node_crypto_1.randomUUID)(),
                checkedAt: this.now().toISOString(),
                notes: message,
            };
        }
    }
}
exports.ProvenanceBundleValidator = ProvenanceBundleValidator;
function hashBundle(bundle) {
    if (!bundle.headHash) {
        throw new Error('Evidence bundle is missing required headHash');
    }
    const seenEntries = new Set();
    const canonicalEntries = bundle.entries.map((entry) => {
        const entryKey = entry.hash ?? (0, data_integrity_1.stableHash)(entry);
        if (seenEntries.has(entryKey)) {
            throw new Error(`Evidence bundle contains duplicate entry: ${entryKey}`);
        }
        seenEntries.add(entryKey);
        return {
            ...entry,
            previousHash: entry.previousHash ?? null,
        };
    });
    return (0, data_integrity_1.stableHash)({
        domain: 'prov-ledger:evidence-bundle:v1',
        headHash: bundle.headHash,
        entries: canonicalEntries,
    });
}
