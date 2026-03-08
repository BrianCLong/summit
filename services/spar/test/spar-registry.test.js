"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const crypto_1 = require("crypto");
const src_1 = require("../src");
class TestSigner {
    secret;
    id;
    constructor(secret, id) {
        this.secret = secret;
        this.id = id;
    }
    sign(payload) {
        return (0, crypto_1.createHmac)('sha256', this.secret).update(payload).digest('hex');
    }
    verify(payload, signature) {
        const expected = this.sign(payload);
        return expected === signature;
    }
}
function buildInput(overrides = {}) {
    const base = {
        templateId: 'summit-demo',
        promptTemplate: 'Summarise: {{text}}',
        inputs: { text: 'Secure reproducibility matters.' },
        toolTraces: [
            {
                toolName: 'retriever',
                input: { query: 'reproducibility' },
                output: { documents: 5 },
                timestamp: '2024-06-01T12:00:00.000Z',
            },
        ],
        output: 'Reproducibility ensures identical outcomes.',
        policyTags: ['restricted', 'llm-output'],
        metadata: {
            model: 'gpt-4.5-secure',
            parameters: { temperature: 0, max_tokens: 128 },
            tools: [
                {
                    name: 'retriever',
                    version: '1.2.3',
                    description: 'Semantic vector retriever',
                },
            ],
        },
    };
    return {
        ...base,
        ...overrides,
        inputs: overrides.inputs ?? base.inputs,
        toolTraces: overrides.toolTraces ?? base.toolTraces,
        policyTags: overrides.policyTags ?? base.policyTags,
        metadata: overrides.metadata ?? base.metadata,
    };
}
(0, vitest_1.describe)('SparRegistry', () => {
    let tempDir;
    let registry;
    const signer = new TestSigner('registry-secret', 'signer-1');
    (0, vitest_1.beforeEach)(() => {
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'spar-registry-'));
        registry = new src_1.SparRegistry(tempDir);
    });
    (0, vitest_1.afterEach)(() => {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)('registers artifacts with stable hashes and produces reproducible manifests', () => {
        const artifact = registry.registerArtifact(buildInput(), signer);
        (0, vitest_1.expect)(artifact.id).toBe('summit-demo:v1');
        (0, vitest_1.expect)(artifact.hash).toHaveLength(64);
        (0, vitest_1.expect)(registry.verifyArtifact(artifact.id, signer)).toBe(true);
        const manifest = registry.exportManifest(artifact.id);
        const replayed = (0, src_1.replayManifest)(manifest, signer);
        const stored = registry.getArtifact(artifact.id);
        const storedCanonical = (0, src_1.stableStringify)({
            promptTemplate: stored.promptTemplate,
            inputs: stored.inputs,
            toolTraces: stored.toolTraces,
            output: stored.output,
            metadata: stored.metadata,
            policyTags: stored.policyTags,
        });
        (0, vitest_1.expect)(replayed.hash).toBe(manifest.hash);
        (0, vitest_1.expect)(replayed.canonical).toBe(storedCanonical);
        (0, vitest_1.expect)(registry.replayManifest(manifest, signer)).toBe(true);
    });
    (0, vitest_1.it)('increments versions immutably and isolates diffs to true changes', () => {
        const first = registry.registerArtifact(buildInput(), signer);
        const secondInput = buildInput({
            output: 'Reproducibility guarantees byte-identical outputs.',
            metadata: {
                model: 'gpt-4.5-secure',
                parameters: { temperature: 0.1, max_tokens: 128 },
                tools: [
                    {
                        name: 'retriever',
                        version: '1.2.3',
                        description: 'Semantic vector retriever',
                    },
                ],
            },
        });
        const second = registry.registerArtifact(secondInput, signer);
        (0, vitest_1.expect)(second.version).toBe(first.version + 1);
        (0, vitest_1.expect)(first.id).toBe('summit-demo:v1');
        (0, vitest_1.expect)(second.id).toBe('summit-demo:v2');
        const diffs = registry.diffArtifacts(first.id, second.id);
        (0, vitest_1.expect)(diffs).toEqual([
            {
                path: 'metadata.parameters.temperature',
                before: 0,
                after: 0.1,
            },
            {
                path: 'output',
                before: 'Reproducibility ensures identical outcomes.',
                after: 'Reproducibility guarantees byte-identical outputs.',
            },
        ]);
    });
    (0, vitest_1.it)('deduplicates identical artifacts via hash comparison', () => {
        const a = registry.registerArtifact(buildInput(), signer);
        const b = registry.registerArtifact(buildInput(), signer);
        (0, vitest_1.expect)(b.id).toBe(a.id);
        (0, vitest_1.expect)(registry.listArtifacts().length).toBe(1);
    });
    (0, vitest_1.it)('detects tampering when manifest data is altered', () => {
        const artifact = registry.registerArtifact(buildInput(), signer);
        const manifest = registry.exportManifest(artifact.id);
        manifest.output = 'tampered';
        (0, vitest_1.expect)(() => (0, src_1.replayManifest)(manifest, signer)).toThrowError(/hash mismatch/i);
    });
});
