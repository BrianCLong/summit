import { ProviderAdapter, ProviderSession } from '../types';

export class ClaudeAdapter implements ProviderAdapter {
  id: ProviderAdapter['id'] = 'claude';
  displayName = 'Claude Code CLI';

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async startSession(): Promise<ProviderSession> {
    // TODO: implement Claude CLI adapter with streaming and tool action parsing.
    throw new Error('Claude adapter not implemented yet.');
  }
}
