"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const evidence_writer_js_1 = require("../src/evidence-writer.js");
describe('evidence writer', () => {
    it('writes stable evidence outputs', async () => {
        const tempDir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'skillpack-evidence-'));
        const report = {
            skillpack: { name: 'ui-preview', path: '.summit/skillpacks/ui-preview' },
            shard: { shard: 'default', reasons: ['Default shard selected.'] },
            context: { taskType: 'review', governanceMode: 'pr' },
            tools: [
                {
                    toolName: 'screenshot',
                    serverName: 'playwright',
                    mode: 'distilled',
                    tokenEstimate: 12,
                    decision: {
                        toolName: 'screenshot',
                        allowed: true,
                        reason: 'Explicitly allowlisted by policy.',
                    },
                    justification: {
                        expectedUtility: 'UI verification',
                        tokenCost: 12,
                        alternatives: ['Manual review'],
                        planStepRef: 'skillpack:ui-preview:default',
                    },
                },
            ],
            totals: { toolsConsidered: 1, toolsInjected: 1, estimatedTokens: 12 },
            policy: { environment: 'pr', breakGlassUsed: false },
            generatedAt: '2026-01-14T00:00:00Z',
        };
        const { jsonPath, markdownPath } = await (0, evidence_writer_js_1.writeToolLoadingEvidence)({
            report,
            outputDir: tempDir,
        });
        const json = JSON.parse(await promises_1.default.readFile(jsonPath, 'utf-8'));
        const markdown = await promises_1.default.readFile(markdownPath, 'utf-8');
        expect(json).toMatchSnapshot();
        expect(markdown).toMatchSnapshot();
    });
});
