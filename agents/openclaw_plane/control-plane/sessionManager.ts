import * as crypto from 'crypto';
import { AgentRunMode, AgentSession } from '../types';

export class SessionManager {
  create(mode: AgentRunMode): AgentSession {
    return {
      sessionId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      mode,
      createdAtEpochMs: Date.now(),
    };
  }
}
