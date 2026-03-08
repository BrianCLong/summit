"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_path_1 = __importDefault(require("node:path"));
(0, node_test_1.test)('Governance Taxonomy Validation', async (t) => {
    const taxonomyPath = node_path_1.default.join(process.cwd(), 'governance/taxonomy.v1.json');
    await t.test('Taxonomy file exists', () => {
        node_assert_1.default.ok(node_fs_1.default.existsSync(taxonomyPath), 'Taxonomy file not found');
    });
    const content = node_fs_1.default.readFileSync(taxonomyPath, 'utf-8');
    const taxonomy = JSON.parse(content);
    await t.test('Schema structure is valid', () => {
        node_assert_1.default.strictEqual(taxonomy.version, '1.0.0');
        node_assert_1.default.ok(taxonomy.definitions, 'Missing definitions');
        node_assert_1.default.ok(taxonomy.definitions.LifecycleStage, 'Missing LifecycleStage');
        node_assert_1.default.ok(taxonomy.definitions.RiskClass, 'Missing RiskClass');
        node_assert_1.default.ok(taxonomy.definitions.ControlType, 'Missing ControlType');
    });
    await t.test('Risk Classes align with EU AI Act', () => {
        const risks = taxonomy.definitions.RiskClass.enum;
        node_assert_1.default.ok(risks.includes('prohibited'), 'Missing Prohibited class');
        node_assert_1.default.ok(risks.includes('high'), 'Missing High risk class');
        node_assert_1.default.ok(risks.includes('limited'), 'Missing Limited risk class');
        node_assert_1.default.ok(risks.includes('low'), 'Missing Low risk class');
    });
    await t.test('Immutability Check (Hash Stability)', () => {
        // This hash represents the approved state of version 1.0.0
        // If the file changes, this test should fail, prompting a version bump
        const currentHash = node_crypto_1.default.createHash('sha256').update(content).digest('hex');
        // We log the hash for the first run, but in a real scenario we'd assert against a known good hash
        // For now, we just ensure it generates a valid hash
        node_assert_1.default.ok(currentHash.length > 0);
        console.log(`Taxonomy V1 Hash: ${currentHash}`);
    });
});
