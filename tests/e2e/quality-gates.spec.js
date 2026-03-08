"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
test_1.test.describe('Quality gate evidence bundle', () => {
    const manifestPath = path_1.default.resolve(process.cwd(), 'EVIDENCE_BUNDLE.manifest.json');
    const acceptancePackDir = path_1.default.resolve(process.cwd(), 'docs/acceptance-packs');
    (0, test_1.test)('enumerates the mandatory CI quality gates', async () => {
        const raw = await promises_1.default.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);
        const gates = (manifest.ci_quality_gates || []).map((gate) => gate.name);
        (0, test_1.expect)(gates).toEqual(test_1.expect.arrayContaining([
            'lint',
            'type-check',
            'unit-tests',
            'integration-tests',
            'e2e-tests',
            'sbom',
            'policy-simulation',
            'secret-scan'
        ]));
    });
    (0, test_1.test)('tracks acceptance pack descriptors for release evidence automation', async () => {
        const files = await promises_1.default.readdir(acceptancePackDir);
        const descriptors = files.filter((file) => file.endsWith('.json'));
        (0, test_1.expect)(descriptors.length).toBeGreaterThan(0);
        const raw = await promises_1.default.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);
        const expectedDescriptors = (manifest.acceptance_packs || []).map((pack) => path_1.default.basename(pack.descriptor));
        (0, test_1.expect)(expectedDescriptors.length).toBeGreaterThan(0);
        expectedDescriptors.forEach((descriptor) => {
            (0, test_1.expect)(descriptors).toContain(descriptor);
        });
    });
});
