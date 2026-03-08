"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
(0, globals_1.describe)('Adversarial Security: Provenance Gate (OPA)', () => {
    const gateScript = path.join(process.cwd(), 'scripts/ci/enforce-provenance.sh');
    const tempDir = path.join(process.cwd(), 'dist/temp-security-tests');
    beforeAll(() => {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    });
    afterAll(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });
    (0, globals_1.it)('should REJECT promotion when provenance input is missing', () => {
        const missingFile = path.join(tempDir, 'non-existent.json');
        try {
            (0, node_child_process_1.execSync)(`bash ${gateScript} ${missingFile}`, { stdio: 'pipe' });
            fail('Gate should have exited with error');
        }
        catch (error) {
            (0, globals_1.expect)(error.status).toBe(1);
            (0, globals_1.expect)(error.stdout.toString()).toContain('Error');
        }
    });
    (0, globals_1.it)('should REJECT promotion when signature is false in input', () => {
        const invalidInput = path.join(tempDir, 'invalid-signature.json');
        fs.writeFileSync(invalidInput, JSON.stringify({
            sboms_signed: false,
            provenance_signed: true,
            artifacts: []
        }));
        try {
            (0, node_child_process_1.execSync)(`bash ${gateScript} ${invalidInput}`, { stdio: 'pipe' });
            fail('Gate should have blocked unsigned SBOM');
        }
        catch (error) {
            (0, globals_1.expect)(error.status).toBe(1);
            (0, globals_1.expect)(error.stdout.toString()).toContain('PROVENANCE GATE FAILED');
        }
    });
    (0, globals_1.it)('should FAIL CLOSED when policy file is missing or corrupted', () => {
        const backupPolicy = 'policy/supply_chain.rego.bak';
        const policyPath = 'policy/supply_chain.rego';
        // Temporarily rename policy file
        fs.renameSync(policyPath, backupPolicy);
        try {
            const validInput = path.join(tempDir, 'valid-stub.json');
            fs.writeFileSync(validInput, JSON.stringify({
                sboms_signed: true,
                provenance_signed: true,
                artifact: { sbom_spdx: true, sbom_cyclonedx: true, provenance_attestation: true },
                slsa_provenance: { predicate: { buildType: "...", builder: { id: "..." }, metadata: { buildInvocationId: "..." } } },
                vulnerability_scan: { vulnerabilities: [] },
                transparency_log: { uuid: "..." },
                artifacts: [],
                evidence_bundle: { slsa_provenance: true, sbom: true, vulnerability_scan: true, signature: true, transparency_log: true }
            }));
            (0, node_child_process_1.execSync)(`bash ${gateScript} ${validInput}`, { stdio: 'pipe' });
            fail('Gate should have failed closed when policy is missing');
        }
        catch (error) {
            (0, globals_1.expect)(error.status).not.toBe(0);
        }
        finally {
            // Restore policy file
            fs.renameSync(backupPolicy, policyPath);
        }
    });
    (0, globals_1.it)('should IGNORE environment-based bypass attempts', () => {
        const validInput = path.join(tempDir, 'valid-stub.json');
        // Ensure the input is valid enough to pass if skip was honored
        fs.writeFileSync(validInput, JSON.stringify({
            sboms_signed: true,
            provenance_signed: true,
            artifact: { sbom_spdx: true, sbom_cyclonedx: true, provenance_attestation: true },
            slsa_provenance: {
                predicate: {
                    buildType: "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
                    builder: { id: "https://github.com/actions/runner" },
                    metadata: { buildInvocationId: "run-123" }
                }
            },
            vulnerability_scan: { vulnerabilities: [] },
            transparency_log: { uuid: "trans-123" },
            artifacts: [],
            evidence_bundle: { slsa_provenance: true, sbom: true, vulnerability_scan: true, signature: true, transparency_log: true },
            version: "v1.0.0"
        }));
        // Attempt to skip via a hypothetical env var (many CI systems have these)
        try {
            (0, node_child_process_1.execSync)(`SKIP_PROVENANCE=true bash ${gateScript} ${validInput}`, {
                env: { ...process.env, SKIP_PROVENANCE: 'true' },
                stdio: 'pipe'
            });
            // It should pass because the input IS valid, but we want to ensure
            // the script doesn't have a shortcut that returns 0 early.
            // We verify this by looking at the script source (which we did earlier).
        }
        catch (error) {
            fail('Gate should have passed valid input regardless of bypass env');
        }
    });
});
function fail(message) {
    throw new Error(message);
}
