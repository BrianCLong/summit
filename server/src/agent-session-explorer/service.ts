import { AgentSessionProvider } from './types.js';

export class AgentSessionExplorerService {
  constructor(private readonly providers: Record<string, AgentSessionProvider>) {}

  getProvider(provider: string): AgentSessionProvider | undefined {
    return this.providers[provider];
  }
}
