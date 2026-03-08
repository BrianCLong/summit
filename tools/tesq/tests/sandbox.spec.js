"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sandbox_1 = require("../src/sandbox");
const redteam_1 = require("../src/redteam");
const policy = `
tenant * {
  quota safe-tool 2 per batch
  quota sandbox-breaker 1 per batch
  allow_syscalls read,write
  deny_syscalls exec,spawn
  deny_network all
  output_max 2048
}
`;
(0, vitest_1.describe)('TESQ Sandbox', () => {
    let sandbox;
    const safeTool = {
        name: 'safe-tool',
        metadata: {
            description: 'Echo payload',
            requiredSyscalls: ['read'],
            maxOutputBytes: 256
        },
        handler: async (request, context) => {
            const message = String(request.payload['message'] ?? '');
            context.createArtifact({
                name: `echo-${request.id}.txt`,
                mediaType: 'text/plain',
                content: message
            });
            return {
                stdout: message.toUpperCase(),
                logs: ['echo complete']
            };
        }
    };
    const sandboxBreaker = {
        name: 'sandbox-breaker',
        metadata: {
            description: 'Attempt escape',
            requiredSyscalls: ['read'],
            maxOutputBytes: 128
        },
        handler: async (_request, context) => {
            context.appendLog('probing sandbox');
            const failures = [];
            try {
                context.requestSyscall('exec');
            }
            catch (error) {
                failures.push(error.message);
            }
            try {
                await context.fetch('https://forbidden.example.com');
            }
            catch (error) {
                failures.push(error.message);
            }
            try {
                const payload = 'x'.repeat(context.getRemainingOutputBudget() + 1);
                context.createArtifact({
                    name: 'overflow.txt',
                    mediaType: 'text/plain',
                    content: payload
                });
            }
            catch (error) {
                failures.push(error.message);
            }
            throw new Error(`Red-team attempts blocked: ${failures.join('; ')}`);
        }
    };
    (0, vitest_1.beforeEach)(() => {
        sandbox = new sandbox_1.Sandbox({ policySource: policy });
        sandbox.registerTool(safeTool);
        sandbox.registerTool(sandboxBreaker);
    });
    (0, vitest_1.it)('allows safe tools within quota and enforces output caps', async () => {
        const request = {
            id: 'safe-1',
            tenantId: 'tenant-a',
            toolName: 'safe-tool',
            payload: { message: 'hello' }
        };
        const first = await sandbox.run(request);
        (0, vitest_1.expect)(first.allowed).toBe(true);
        (0, vitest_1.expect)(first.result?.artifacts).toHaveLength(1);
        (0, vitest_1.expect)(first.result?.stdout).toBe('HELLO');
        const second = await sandbox.run({ ...request, id: 'safe-2' });
        (0, vitest_1.expect)(second.allowed).toBe(true);
        const third = await sandbox.run({ ...request, id: 'safe-3' });
        (0, vitest_1.expect)(third.allowed).toBe(false);
        (0, vitest_1.expect)(third.decision.reason).toContain('Quota exceeded');
    });
    (0, vitest_1.it)('blocks unauthorized syscalls, network egress, and output overflow attempts', async () => {
        const result = await sandbox.run({
            id: 'breaker-1',
            tenantId: 'tenant-a',
            toolName: 'sandbox-breaker',
            payload: {}
        });
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.decision.reason).toContain('Red-team attempts blocked');
        const violations = sandbox
            .getAuditLog()
            .getEvents()
            .filter((event) => event.type === 'violation');
        (0, vitest_1.expect)(violations.some((v) => v.metadata['kind'] === 'syscall')).toBe(true);
        (0, vitest_1.expect)(violations.some((v) => v.metadata['kind'] === 'network')).toBe(true);
        (0, vitest_1.expect)(violations.some((v) => v.metadata['kind'] === 'output')).toBe(true);
    });
    (0, vitest_1.it)('produces deterministic outcomes for identical requests', async () => {
        const request = {
            id: 'deterministic',
            tenantId: 'tenant-a',
            toolName: 'safe-tool',
            payload: { message: 'deterministic' }
        };
        const sandboxA = new sandbox_1.Sandbox({ policySource: policy });
        sandboxA.registerTool(safeTool);
        const sandboxB = new sandbox_1.Sandbox({ policySource: policy });
        sandboxB.registerTool(safeTool);
        const [first, second] = await Promise.all([
            sandboxA.run(request),
            sandboxB.run(request)
        ]);
        (0, vitest_1.expect)(first.allowed).toBe(second.allowed);
        (0, vitest_1.expect)(first.decision.reason ?? null).toBe(second.decision.reason ?? null);
    });
    (0, vitest_1.it)('red-team harness seeds escape attempts that are contained and logged', async () => {
        const harnessSandbox = await (0, redteam_1.runHarness)();
        const breakerEvents = harnessSandbox
            .getAuditLog()
            .getEvents()
            .filter((event) => event.metadata['toolName'] === 'sandbox-breaker');
        (0, vitest_1.expect)(breakerEvents.length).toBeGreaterThan(0);
        const violationKinds = new Set(harnessSandbox
            .getAuditLog()
            .getEvents()
            .filter((event) => event.type === 'violation')
            .map((event) => event.metadata['kind']));
        (0, vitest_1.expect)(violationKinds.has('syscall')).toBe(true);
        (0, vitest_1.expect)(violationKinds.has('network')).toBe(true);
        (0, vitest_1.expect)(violationKinds.has('output')).toBe(true);
    });
});
