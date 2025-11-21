/**
 * Unit tests for Handover Protocol
 */

import { HandoverProtocol } from '../handover-protocol.js';
import { PartnerRegistry } from '../partner-registry.js';
import type { HandoverRequest, SessionContext } from '../types.js';

// Mock fetch for tests
const originalFetch = global.fetch;

describe('HandoverProtocol', () => {
  let protocol: HandoverProtocol;
  let registry: PartnerRegistry;

  beforeAll(async () => {
    registry = new PartnerRegistry(60000);
    await registry.initialize();
  });

  afterAll(async () => {
    await registry.shutdown();
  });

  beforeEach(() => {
    protocol = new HandoverProtocol({
      defaultTimeoutMs: 5000,
      maxRetries: 2,
      contextSizeLimit: 32000,
      enableEncryption: false,
      auditAllHandovers: true,
    });
  });

  describe('session creation', () => {
    const createMockContext = (): SessionContext => ({
      conversationId: 'test-conv-123',
      userId: 'user-456',
      language: 'en',
      targetLanguage: 'et',
      intent: 'tax_inquiry',
      entities: [
        { type: 'query', value: 'tax status', confidence: 0.95, redacted: false },
      ],
      summary: 'User inquiring about tax status',
      metadata: { domain: 'tax' },
      dataClassification: 'internal',
      retentionPolicy: {
        maxDurationHours: 24,
        deleteOnCompletion: true,
        auditRetentionDays: 90,
        allowedRegions: ['US', 'EU'],
      },
    });

    it('should create session with valid request', async () => {
      const request: HandoverRequest = {
        sessionId: 'session-001',
        sourceNation: 'US',
        targetNation: 'EE',
        context: createMockContext(),
        priority: 'normal',
        timeoutMs: 5000,
      };

      // Mock successful handover response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: request.sessionId,
            accepted: true,
            targetSessionId: 'remote-session-001',
            estimatedWaitMs: 0,
          }),
      });

      const response = await protocol.initiateHandover(request);

      expect(response.accepted).toBe(true);
      expect(response.sessionId).toBe(request.sessionId);

      const session = protocol.getSession(request.sessionId);
      expect(session).toBeDefined();
      expect(session?.originNation).toBe('US');
      expect(session?.targetNation).toBe('EE');
    });

    it('should reject handover for unknown target nation', async () => {
      const request: HandoverRequest = {
        sessionId: 'session-002',
        sourceNation: 'US',
        targetNation: 'XX',
        context: createMockContext(),
        priority: 'normal',
        timeoutMs: 5000,
      };

      await expect(protocol.initiateHandover(request)).rejects.toThrow(
        'Unknown target nation: XX'
      );
    });

    it('should reject handover for inactive partner', async () => {
      // Set Latvia to inactive
      await registry.updateStatus('LV', 'inactive');

      const request: HandoverRequest = {
        sessionId: 'session-003',
        sourceNation: 'US',
        targetNation: 'LV',
        context: createMockContext(),
        priority: 'normal',
        timeoutMs: 5000,
      };

      const response = await protocol.initiateHandover(request);
      expect(response.accepted).toBe(false);
      expect(response.rejectionReason).toContain('not active');
    });

    it('should reject handover when classification exceeds trust level', async () => {
      const context = createMockContext();
      context.dataClassification = 'top_secret';

      const request: HandoverRequest = {
        sessionId: 'session-004',
        sourceNation: 'US',
        targetNation: 'EE',
        context,
        priority: 'normal',
        timeoutMs: 5000,
      };

      const response = await protocol.initiateHandover(request);
      expect(response.accepted).toBe(false);
      expect(response.rejectionReason).toContain('cannot handle');
    });
  });

  describe('session acceptance', () => {
    const createMockContext = (): SessionContext => ({
      conversationId: 'test-conv-789',
      language: 'et',
      intent: 'business_registration',
      entities: [],
      summary: 'Business registration inquiry',
      metadata: {},
      dataClassification: 'public',
      retentionPolicy: {
        maxDurationHours: 24,
        deleteOnCompletion: true,
        auditRetentionDays: 90,
        allowedRegions: ['EU'],
      },
    });

    it('should accept valid incoming handover', async () => {
      const request: HandoverRequest = {
        sessionId: 'incoming-001',
        sourceNation: 'EE',
        targetNation: 'US',
        context: createMockContext(),
        priority: 'normal',
        timeoutMs: 5000,
      };

      const response = await protocol.acceptHandover(request);

      expect(response.accepted).toBe(true);
      expect(response.targetSessionId).toBeDefined();
      expect(response.capabilities).toBeDefined();
    });

    it('should reject handover from unknown source', async () => {
      const request: HandoverRequest = {
        sessionId: 'incoming-002',
        sourceNation: 'XX',
        targetNation: 'US',
        context: createMockContext(),
        priority: 'normal',
        timeoutMs: 5000,
      };

      const response = await protocol.acceptHandover(request);
      expect(response.accepted).toBe(false);
      expect(response.rejectionReason).toContain('not recognized');
    });
  });

  describe('session lifecycle', () => {
    it('should track active sessions', async () => {
      const request: HandoverRequest = {
        sessionId: 'lifecycle-001',
        sourceNation: 'EE',
        targetNation: 'US',
        context: {
          conversationId: 'conv-lifecycle',
          language: 'en',
          intent: 'test',
          entities: [],
          summary: 'Test session',
          metadata: {},
          dataClassification: 'public',
          retentionPolicy: {
            maxDurationHours: 1,
            deleteOnCompletion: true,
            auditRetentionDays: 30,
            allowedRegions: ['US'],
          },
        },
        priority: 'normal',
        timeoutMs: 5000,
      };

      await protocol.acceptHandover(request);

      const activeSessions = protocol.getActiveSessions();
      expect(activeSessions.length).toBeGreaterThan(0);
    });

    it('should complete session', async () => {
      const request: HandoverRequest = {
        sessionId: 'lifecycle-002',
        sourceNation: 'EE',
        targetNation: 'US',
        context: {
          conversationId: 'conv-complete',
          language: 'en',
          intent: 'test',
          entities: [],
          summary: 'Test',
          metadata: {},
          dataClassification: 'public',
          retentionPolicy: {
            maxDurationHours: 1,
            deleteOnCompletion: true,
            auditRetentionDays: 30,
            allowedRegions: ['US'],
          },
        },
        priority: 'normal',
        timeoutMs: 5000,
      };

      const response = await protocol.acceptHandover(request);
      expect(response.targetSessionId).toBeDefined();

      await protocol.completeSession(response.targetSessionId!);

      // Session should be deleted (deleteOnCompletion: true)
      const session = protocol.getSession(response.targetSessionId!);
      expect(session).toBeUndefined();
    });
  });

  describe('context sanitization', () => {
    it('should redact sensitive entity types', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: 'sanitize-001',
            accepted: true,
            targetSessionId: 'remote-sanitize-001',
          }),
      });

      const request: HandoverRequest = {
        sessionId: 'sanitize-001',
        sourceNation: 'US',
        targetNation: 'EE',
        context: {
          conversationId: 'conv-sanitize',
          language: 'en',
          intent: 'verify_identity',
          entities: [
            { type: 'ssn', value: '123-45-6789', confidence: 1.0, redacted: false },
            { type: 'name', value: 'John Doe', confidence: 0.95, redacted: false },
          ],
          summary: 'User SSN is 123-45-6789',
          metadata: { domain: 'identity' },
          dataClassification: 'confidential',
          retentionPolicy: {
            maxDurationHours: 1,
            deleteOnCompletion: true,
            auditRetentionDays: 90,
            allowedRegions: ['US', 'EU'],
          },
        },
        priority: 'normal',
        timeoutMs: 5000,
      };

      await protocol.initiateHandover(request);

      // Verify fetch was called with sanitized data
      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // SSN should be redacted
      const ssnEntity = body.context.entities.find(
        (e: { type: string }) => e.type === 'ssn'
      );
      expect(ssnEntity.value).toBe('[REDACTED]');
      expect(ssnEntity.redacted).toBe(true);

      // Name should not be redacted
      const nameEntity = body.context.entities.find(
        (e: { type: string }) => e.type === 'name'
      );
      expect(nameEntity.value).toBe('John Doe');
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
});
