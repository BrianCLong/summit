"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseGate = exports.ReleaseGate = void 0;
const DLPService_js_1 = require("../../services/DLPService.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ReleaseGate {
    artifactsDir;
    constructor(artifactsDir = 'artifacts/sbom') {
        this.artifactsDir = artifactsDir;
    }
    async verifyRelease(version, tenantId = 'system') {
        const sbomPath = path_1.default.join(this.artifactsDir, `sbom-${version}.json`);
        const slsaPath = path_1.default.join(this.artifactsDir, `attestation-${version}.intoto.jsonl`);
        const sigPath = `${sbomPath}.sig`;
        const sbomExists = fs_1.default.existsSync(sbomPath);
        const slsaExists = fs_1.default.existsSync(slsaPath);
        // In real scenario, verify signature with cosign
        const signed = fs_1.default.existsSync(sigPath) || fs_1.default.existsSync(`${sbomPath}.cosign.sig`);
        // Governance Check: Simulate checking if DLP is active and policies are loaded
        // Explicitly scan a dummy artifact to verify DLP is functioning
        const dlpResult = await DLPService_js_1.dlpService.scanContent(JSON.stringify({ test: "pii" }), {
            tenantId,
            userId: 'system',
            userRole: 'system',
            operationType: 'read',
            contentType: 'application/json'
        });
        const governanceCompliant = DLPService_js_1.dlpService.listPolicies().length > 0 && dlpResult !== null;
        const passed = sbomExists && slsaExists && signed && governanceCompliant;
        return {
            passed,
            reason: passed ? 'All checks passed' : 'Missing artifacts or compliance failures',
            artifacts: passed ? {
                version,
                sbomPath,
                slsaPath,
                signaturePath: sigPath
            } : undefined,
            checks: {
                sbomExists,
                slsaExists,
                signed,
                governanceCompliant
            }
        };
    }
}
exports.ReleaseGate = ReleaseGate;
exports.releaseGate = new ReleaseGate();
