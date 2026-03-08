import { AgentSession } from '../types';
import { SessionManager } from './sessionManager';

export class IngressRouter {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  handleIncomingRequest(mode: 'plan_only' | 'execute'): AgentSession {
    // Normalize browser or adapter inputs
    return this.sessionManager.create(mode);
  }
}
