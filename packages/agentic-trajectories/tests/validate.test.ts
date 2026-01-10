import { DEFAULT_SCHEMA_VERSION, GENERATOR_VERSION, AgentTrajectory } from '../src/schema.js';
import { validateTrajectory } from '../src/validate.js';

const baseTrajectory: AgentTrajectory = {
    id: 'traj-1',
    meta: {
        schema_version: DEFAULT_SCHEMA_VERSION,
        generator_version: GENERATOR_VERSION,
        task_type: 'code'
    },
    turns: [
        { role: 'user', content: 'Build feature' },
        {
            role: 'assistant',
            plan: 'Do something',
            toolCalls: [
                { name: 'bash', arguments: { command: 'npm test' }, call_id: 'call-1', ts: new Date().toISOString() }
            ],
            toolResults: [
                { call_id: 'call-1', ok: true, stdout: 'ok', ts: new Date().toISOString() }
            ],
            reflection: 'All good'
        }
    ]
};

describe('validateTrajectory', () => {
    it('accepts a structurally valid trajectory', () => {
        const result = validateTrajectory(baseTrajectory);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects dangerous bash by default', () => {
        const dangerous: AgentTrajectory = {
            ...baseTrajectory,
            turns: [
                baseTrajectory.turns[0],
                {
                    role: 'assistant',
                    toolCalls: [
                        { name: 'bash', arguments: { command: 'rm -rf /' }, call_id: 'call-evil', ts: new Date().toISOString() }
                    ],
                    toolResults: [
                        { call_id: 'call-evil', ok: false, stderr: 'oops', ts: new Date().toISOString() }
                    ]
                }
            ]
        };
        const result = validateTrajectory(dangerous);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Dangerous bash command'))).toBe(true);
    });

    it('detects missing results and call mismatches', () => {
        const broken: AgentTrajectory = {
            ...baseTrajectory,
            turns: [
                baseTrajectory.turns[0],
                {
                    role: 'assistant',
                    toolCalls: [
                        { name: 'bash', arguments: { command: 'npm test' }, call_id: 'call-1', ts: new Date().toISOString() },
                        { name: 'browser', arguments: { url: 'https://example.com' }, call_id: 'call-2', ts: new Date().toISOString() }
                    ],
                    toolResults: [
                        { call_id: 'unknown', ok: true, stdout: '???', ts: new Date().toISOString() }
                    ]
                }
            ]
        };
        const result = validateTrajectory(broken, { allowedTools: ['bash', 'browser'] });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Tool result unknown'))).toBe(true);
        expect(result.errors.some((e) => e.includes('Tool call call-1 is missing a result'))).toBe(true);
        expect(result.errors.some((e) => e.includes('Tool call call-2 is missing a result'))).toBe(true);
    });

    it('enforces allowlist', () => {
        const invalidTool: AgentTrajectory = {
            ...baseTrajectory,
            turns: [
                baseTrajectory.turns[0],
                {
                    role: 'assistant',
                    toolCalls: [
                        { name: 'unauthorized', arguments: {}, call_id: 'call-3', ts: new Date().toISOString() }
                    ],
                    toolResults: []
                }
            ]
        };
        const result = validateTrajectory(invalidTool, { allowedTools: ['bash'] });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('not in allowlist'))).toBe(true);
    });
});
