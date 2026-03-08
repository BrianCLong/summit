import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../../agents/openclaw_plane/control-plane/sessionManager';

describe('SessionManager', () => {
  it('should create a session with valid properties', () => {
    const manager = new SessionManager();
    const session = manager.create('plan_only');
    expect(session.mode).toBe('plan_only');
    expect(session.sessionId).toBeDefined();
    expect(session.runId).toBeDefined();
    expect(typeof session.createdAtEpochMs).toBe('number');
  });
});
