import path from 'node:path';
import os from 'node:os';
import { AgentSessionExplorerService } from './service.js';
import { ClaudeCodeHistoryProvider } from './providers/claudeCodeHistoryProvider.js';

export function createDefaultAgentSessionExplorerService() {
  return new AgentSessionExplorerService({
    claude: new ClaudeCodeHistoryProvider({
      rootPath:
        process.env.SUMMIT_AGENT_HISTORY_ROOT || path.join(os.homedir(), '.claude'),
    }),
  });
}

