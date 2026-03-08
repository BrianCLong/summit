"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
describe('SOC Control Verification', () => {
    const repoRoot = path_1.default.resolve(path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url)), '..', '..', '..');
    test('SOC2-CC-6.1: Vulnerability scanning is configured', () => {
        const workflowPath = path_1.default.join(repoRoot, '.github/workflows/release-ga-pipeline.yml');
        const workflowContent = fs_1.default.readFileSync(workflowPath, 'utf8');
        expect(workflowContent).toMatch(/scan_secrets\.sh/);
        expect(workflowContent).toMatch(/security_audit_gate\.mjs/);
    });
    test('SOC2-CC-2.1: SBOM generation is configured', () => {
        const workflowPath = path_1.default.join(repoRoot, '.github/workflows/_reusable-slsa-build.yml');
        const workflowContent = fs_1.default.readFileSync(workflowPath, 'utf8');
        expect(workflowContent).toMatch(/syft/);
        expect(workflowContent).toMatch(/sbom\.cdx\.json/);
    });
    test('SOC2-CC-2.2: Artifact signing is configured', () => {
        const workflowPath = path_1.default.join(repoRoot, '.github/workflows/_reusable-slsa-build.yml');
        const workflowContent = fs_1.default.readFileSync(workflowPath, 'utf8');
        expect(workflowContent).toMatch(/cosign sign/);
        expect(workflowContent).toMatch(/cosign attest/);
    });
    test('SOC2-CC-8.1: Branch protection policy prerequisite exists', () => {
        const codeownersPath = path_1.default.join(repoRoot, 'CODEOWNERS');
        expect(fs_1.default.existsSync(codeownersPath)).toBe(true);
    });
    test('SOC2-CC-6.6: Boundary protection policy is present', () => {
        const policyPath = path_1.default.join(repoRoot, 'SECURITY_GA_GATE.md');
        expect(fs_1.default.existsSync(policyPath)).toBe(true);
    });
});
