"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const map_elites_1 = require("../../src/longhorizon/map-elites");
const evaluator_1 = require("../../src/longhorizon/evaluator");
const run_1 = require("../../src/longhorizon/run");
function buildCandidate(id, score = 50) {
    return {
        id,
        title: `Candidate ${id}`,
        patch: { id: `patch-${id}`, diff: '+++ b/docs/readme.md', filesTouched: ['docs/readme.md'] },
        metadata: { diffSize: 10, risk: 2, testImpact: 1, locality: 'docs' },
        status: 'evaluated',
        noveltyScore: 1,
        evaluation: {
            id: `eval-${id}`,
            score,
            passed: true,
            runtimeMs: 5,
            coverageDelta: 0,
            policyViolations: [],
            riskFlags: [],
            commandResults: [],
            reviewConsensus: true,
            deterministicReplay: `replay-${id}`,
        },
    };
}
describe('MapElitesArchive', () => {
    it('keeps the best candidate per cell', () => {
        const archive = new map_elites_1.MapElitesArchive({
            riskBins: [3, 7, 12],
            diffSizeBins: [20, 80, 200],
            testImpactBins: [1, 3, 6],
        });
        const low = buildCandidate('low', 40);
        const high = buildCandidate('high', 90);
        archive.insert(low);
        archive.insert(high);
        const cell = archive.getCell(archive.cellKey(low));
        expect(cell?.id).toBe('high');
    });
});
describe('LongHorizonRunner', () => {
    it('checkpoints and resumes', async () => {
        const baseDir = (0, fs_1.mkdtempSync)(path_1.default.join((0, os_1.tmpdir)(), 'longhorizon-'));
        const config = {
            runId: 'run-1',
            tenantId: 'tenant-1',
            taskPrompt: 'Add a feature flag and docs',
            allowedPaths: ['docs/'],
            steps: [
                { id: 'step-1', title: 'Plan', dependsOn: [], role: 'planner' },
            ],
            budgets: { maxTokens: 1000, maxSeconds: 600, maxToolCalls: 10 },
            evaluationProfile: { name: 'fast', commands: [], targetedTests: [] },
            islands: 2,
            migrationInterval: 1,
            candidateSeeds: [
                {
                    id: 'seed-1',
                    title: 'Doc flag',
                    patch: '+++ b/docs/readme.md\n+flag: true',
                    metadata: { diffSize: 5, risk: 1, testImpact: 1, locality: 'docs' },
                },
            ],
        };
        const runner = new run_1.LongHorizonRunner(config, {
            evaluationProfile: config.evaluationProfile,
            baseArtifactsDir: path_1.default.join(baseDir, 'artifacts'),
            checkpointDir: path_1.default.join(baseDir, 'checkpoints'),
        });
        const checkpointPath = await runner.checkpoint();
        const resumed = await run_1.LongHorizonRunner.resume(checkpointPath, config, {
            evaluationProfile: config.evaluationProfile,
            baseArtifactsDir: path_1.default.join(baseDir, 'artifacts'),
            checkpointDir: path_1.default.join(baseDir, 'checkpoints'),
        });
        await expect(resumed.run()).resolves.toContain('artifacts');
    });
});
describe('evaluateCandidate', () => {
    it('is deterministic for identical inputs', async () => {
        const candidate = buildCandidate('deterministic', 0);
        const runner = { run: async () => ({ exitCode: 0, output: '', durationMs: 1 }) };
        const profile = { name: 'fast', commands: [], targetedTests: [] };
        const clock = () => new Date('2024-01-01T00:00:00.000Z');
        const first = await (0, evaluator_1.evaluateCandidate)(candidate, runner, { profile, clock });
        const second = await (0, evaluator_1.evaluateCandidate)(candidate, runner, { profile, clock });
        expect(first.score).toEqual(second.score);
        expect(first.deterministicReplay).toEqual(second.deterministicReplay);
    });
});
