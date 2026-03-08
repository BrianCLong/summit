"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = require("node:fs");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const index_js_1 = require("../src/evidence/index.js");
const fixedNow = () => new Date('2026-01-15T00:00:00Z');
(0, vitest_1.describe)('Plan IR', () => {
    (0, vitest_1.it)('serializes and validates', () => {
        const request = {
            messages: [{ role: 'user', content: 'Summarize the briefing.' }],
            model: 'gpt-4o',
        };
        const plan = (0, index_js_1.buildPlanFromRequest)(request, {
            runId: 'run-1',
            planId: 'plan-1',
            goal: 'Summarize the briefing.',
        });
        (0, vitest_1.expect)(index_js_1.PlanIRSchema.parse(plan)).toEqual(plan);
    });
});
(0, vitest_1.describe)('Action contracts', () => {
    (0, vitest_1.it)('validates args and postconditions', async () => {
        const registry = new index_js_1.ActionContractRegistry();
        registry.register({
            toolName: 'math.add',
            argsSchema: zod_1.z.object({ a: zod_1.z.number(), b: zod_1.z.number() }),
            outputSchema: zod_1.z.object({ sum: zod_1.z.number() }),
            postcondition: (result) => ({ ok: result.sum >= 0, issues: ['sum negative'] }),
            redactionRules: [{ path: 'a' }],
        });
        const runtime = new index_js_1.ToolRuntime(registry, { strictPostconditions: false });
        runtime.registerHandler('math.add', (args) => ({ sum: args.a + args.b }));
        const result = await runtime.runTool('math.add', { a: 2, b: 3 }, { runId: 'run-1' });
        (0, vitest_1.expect)(result.success).toBe(true);
        const invalid = await runtime.runTool('math.add', { a: 'nope' }, { runId: 'run-1' });
        (0, vitest_1.expect)(invalid.success).toBe(false);
        const postcondition = await runtime.runTool('math.add', { a: -2, b: -3 }, { runId: 'run-1' });
        (0, vitest_1.expect)(postcondition.success).toBe(true);
        (0, vitest_1.expect)(postcondition.postconditionIssues).toContain('sum negative');
    });
});
(0, vitest_1.describe)('Evidence bundle', () => {
    (0, vitest_1.it)('writes stable manifests', async () => {
        const tempDir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'evidence-test-'));
        const request = {
            messages: [{ role: 'user', content: 'Plan test.' }],
            model: 'gpt-4o',
        };
        const plan = (0, index_js_1.buildPlanFromRequest)(request, {
            runId: 'run-1',
            planId: 'plan-1',
            goal: 'Plan test.',
        });
        const writerA = new index_js_1.EvidenceBundleWriter(plan, {
            bundlesDir: tempDir,
            now: fixedNow,
            bundleId: 'bundle-a',
        });
        await writerA.initialize();
        await writerA.record({
            type: 'step:started',
            timestamp: fixedNow().toISOString(),
            run_id: 'run-1',
            step_id: 'step-1',
        });
        await writerA.finalize();
        const writerB = new index_js_1.EvidenceBundleWriter(plan, {
            bundlesDir: tempDir,
            now: fixedNow,
            bundleId: 'bundle-b',
        });
        await writerB.initialize();
        await writerB.record({
            type: 'step:started',
            timestamp: fixedNow().toISOString(),
            run_id: 'run-1',
            step_id: 'step-1',
        });
        await writerB.finalize();
        const manifestA = await node_fs_1.promises.readFile(node_path_1.default.join(tempDir, 'bundle-a', 'manifest.json'), 'utf8');
        const manifestB = await node_fs_1.promises.readFile(node_path_1.default.join(tempDir, 'bundle-b', 'manifest.json'), 'utf8');
        (0, vitest_1.expect)(manifestA).toEqual(manifestB);
    });
    (0, vitest_1.it)('replays a sample workflow deterministically', async () => {
        const tempDir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'evidence-replay-'));
        const plan = index_js_1.PlanIRSchema.parse({
            plan_id: 'plan-replay',
            run_id: 'run-replay',
            goal: 'Test replay workflow.',
            steps: [
                {
                    step_id: 'step-tool',
                    name: 'Tool step',
                    tool_name: 'tool.echo',
                    args_schema_ref: 'tool.echo.v1',
                    preconditions: [],
                    postconditions: [],
                    permissions: [],
                },
            ],
        });
        const registry = new index_js_1.ActionContractRegistry();
        registry.register({
            toolName: 'tool.echo',
            argsSchema: zod_1.z.object({ message: zod_1.z.string() }),
            outputSchema: zod_1.z.object({ echoed: zod_1.z.string() }),
            redactionRules: [{ path: 'message' }],
        });
        const runtime = new index_js_1.ToolRuntime(registry);
        runtime.registerHandler('tool.echo', (args) => ({ echoed: args.message }));
        const manager = new index_js_1.EvidenceBundleManager({ bundlesDir: tempDir, now: fixedNow });
        await manager.createBundle(plan, plan.run_id);
        const recorder = manager.getBundle(plan.run_id);
        await recorder?.record({
            type: 'step:started',
            timestamp: fixedNow().toISOString(),
            run_id: plan.run_id,
            step_id: 'step-tool',
            tool_name: 'tool.echo',
        });
        await runtime.runTool('tool.echo', { message: 'hello' }, {
            runId: plan.run_id,
            planId: plan.plan_id,
            stepId: 'step-tool',
            recorder,
        });
        await recorder?.record({
            type: 'step:completed',
            timestamp: fixedNow().toISOString(),
            run_id: plan.run_id,
            step_id: 'step-tool',
        });
        await manager.finalize(plan.run_id, 'completed');
        const bundlePath = node_path_1.default.join(tempDir, `${plan.run_id}-${plan.plan_id}`);
        const report = await (0, index_js_1.replayEvidenceBundle)({ bundlePath, strict: true, contractRegistry: registry });
        (0, vitest_1.expect)(report.ok).toBe(true);
    });
});
