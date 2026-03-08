"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatermarkVerificationService = void 0;
const watermarks_js_1 = require("./__fixtures__/watermarks.js");
const MockWatermarkExtractor_js_1 = require("./MockWatermarkExtractor.js");
class WatermarkVerificationService {
    manifestStore;
    auditLedger;
    extractor;
    constructor(manifestStore = watermarks_js_1.manifestFixtures, auditLedger = watermarks_js_1.auditLedgerFixtures, extractor = new MockWatermarkExtractor_js_1.MockWatermarkExtractor()) {
        this.manifestStore = manifestStore;
        this.auditLedger = auditLedger;
        this.extractor = extractor;
    }
    parseWatermark(rawWatermark) {
        const parts = rawWatermark.split(';').reduce((acc, part) => {
            const [key, value] = part.split('=');
            if (key && value) {
                acc[key.trim()] = value.trim();
            }
            return acc;
        }, {});
        const exportId = parts.exportId;
        const manifestHashPrefix = parts.manifestHash;
        const policyHash = parts.policyHash;
        if (!exportId || !manifestHashPrefix || !policyHash) {
            throw new Error('Invalid watermark payload: missing required fields');
        }
        return {
            exportId,
            manifestHashPrefix,
            policyHash,
            raw: rawWatermark,
        };
    }
    async verify({ exportId, artifactId, watermark, }) {
        const mismatches = [];
        try {
            const observedWatermark = this.parseWatermark(watermark || (await this.extractor.extract(artifactId || '')));
            if (observedWatermark.exportId !== exportId) {
                mismatches.push('export-id-mismatch');
            }
            const manifest = this.manifestStore[exportId];
            if (!manifest) {
                return {
                    valid: false,
                    manifestHash: null,
                    observedWatermark,
                    mismatches: [...mismatches, 'manifest-not-found'],
                    reasonCodes: [...mismatches, 'manifest-not-found'],
                };
            }
            const ledgerEntry = this.auditLedger[exportId];
            if (!ledgerEntry) {
                return {
                    valid: false,
                    manifestHash: manifest.manifestHash,
                    observedWatermark,
                    mismatches: [...mismatches, 'audit-ledger-missing'],
                    reasonCodes: [...mismatches, 'audit-ledger-missing'],
                };
            }
            if (!manifest.manifestHash.startsWith(observedWatermark.manifestHashPrefix)) {
                mismatches.push('manifest-hash-mismatch');
            }
            if (!ledgerEntry.manifestHash.startsWith(observedWatermark.manifestHashPrefix)) {
                mismatches.push('audit-ledger-manifest-mismatch');
            }
            if (ledgerEntry.policyHash !== observedWatermark.policyHash) {
                mismatches.push('policy-hash-mismatch');
            }
            return {
                valid: mismatches.length === 0,
                manifestHash: manifest.manifestHash,
                observedWatermark,
                mismatches,
                reasonCodes: mismatches,
            };
        }
        catch (error) {
            return {
                valid: false,
                manifestHash: null,
                observedWatermark: null,
                mismatches: ['unreadable-watermark'],
                reasonCodes: ['unreadable-watermark', error.message],
            };
        }
    }
}
exports.WatermarkVerificationService = WatermarkVerificationService;
