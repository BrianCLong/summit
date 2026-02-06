import { normalizeOpsEvent } from '../../../src/agents/ops/normalize';

describe('normalizeOpsEvent', () => {
  it('normalizes snake_case fields', () => {
    const normalized = normalizeOpsEvent({
      type: 'ToolUse',
      tool_name: 'search',
      tool_input: { q: 'signal' },
      tool_response: { result: 'ok' },
      session_id: 'session-1',
      cwd: '/workspace',
    });

    expect(normalized).toEqual({
      type: 'ToolUse',
      toolName: 'search',
      toolInput: { q: 'signal' },
      toolOutput: { result: 'ok' },
      sessionId: 'session-1',
      directory: '/workspace',
    });
  });

  it('normalizes camelCase fields', () => {
    const normalized = normalizeOpsEvent({
      type: 'TaskCreate',
      toolName: 'planner',
      toolInput: { step: 1 },
      toolOutput: { ok: true },
      sessionId: 'session-2',
      directory: '/tmp',
    });

    expect(normalized).toEqual({
      type: 'TaskCreate',
      toolName: 'planner',
      toolInput: { step: 1 },
      toolOutput: { ok: true },
      sessionId: 'session-2',
      directory: '/tmp',
    });
  });

  it('rejects unknown fields', () => {
    expect(() =>
      normalizeOpsEvent({
        type: 'ToolUse',
        toolName: 'search',
        unexpected: true,
      } as never),
    ).toThrow(/Unknown ops event field/);
  });

  it('rejects unknown event types', () => {
    expect(() =>
      normalizeOpsEvent({
        type: 'UnknownEvent',
      }),
    ).toThrow(/Unknown ops event type/);
  });
});
