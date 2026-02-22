import { ProviderAdapter, ProviderSession, ToolAction } from '../types';

export class FakeAdapter implements ProviderAdapter {
  id: ProviderAdapter['id'] = 'fake';
  displayName = 'Fake Adapter';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async startSession(options: {
    sessionId: string;
    systemPrompt: string;
  }): Promise<ProviderSession> {
    const basePrompt = options.systemPrompt;

    return {
      sendMessage: async (input, handlers) => {
        const tokens = [
          `SYSTEM:${basePrompt}`,
          '\n',
          `USER:${input}`,
          '\n',
          'RESPONSE:ok',
        ];

        for (const token of tokens) {
          handlers.onToken(token);
          await Promise.resolve();
        }

        const action: ToolAction = {
          type: 'tool_exec',
          command: 'echo "fake"',
        };
        handlers.onToolAction?.(action);
      },
      stop: async () => Promise.resolve(),
    };
  }
}
