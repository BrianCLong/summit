import { describe, expect, it } from 'vitest';
import { ClaudeAdapter } from '../src/adapters/ClaudeAdapter';
import { FakeAdapter } from '../src/adapters/FakeAdapter';
import { GeminiAdapter } from '../src/adapters/GeminiAdapter';


describe('provider adapter contract', () => {
  it('streams output and tool actions', async () => {
    const adapter = new FakeAdapter();
    const session = await adapter.startSession({
      sessionId: 'session-123',
      systemPrompt: 'test',
    });

    let output = '';
    let toolAction = '';

    await session.sendMessage('ping', {
      onToken: (token) => {
        output += token;
      },
      onToolAction: (action) => {
        toolAction = action.command ?? '';
      },
    });

    expect(output).toContain('RESPONSE:ok');
    expect(toolAction).toContain('echo');
  });

  it('stubs fail gracefully for unimplemented adapters', async () => {
    const claude = new ClaudeAdapter();
    const gemini = new GeminiAdapter();

    expect(await claude.isAvailable()).toBe(false);
    expect(await gemini.isAvailable()).toBe(false);

    await expect(claude.startSession()).rejects.toThrow(
      /not implemented/i,
    );
    await expect(gemini.startSession()).rejects.toThrow(
      /not implemented/i,
    );
  });
});
