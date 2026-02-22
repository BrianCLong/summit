import { ProviderAdapter, ProviderSession } from '../types';

export class GeminiAdapter implements ProviderAdapter {
  id: ProviderAdapter['id'] = 'gemini';
  displayName = 'Gemini CLI';

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async startSession(): Promise<ProviderSession> {
    // TODO: implement Gemini CLI adapter with streaming and tool action parsing.
    throw new Error('Gemini adapter not implemented yet.');
  }
}
