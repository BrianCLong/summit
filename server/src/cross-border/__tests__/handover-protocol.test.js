"use strict";
/**
 * Unit tests for Handover Protocol
 */
Object.defineProperty(exports, "__esModule", { value: true });
const handover_protocol_js_1 = require("../handover-protocol.js");
const partner_registry_js_1 = require("../partner-registry.js");
const globals_1 = require("@jest/globals");
// Mock fetch for tests
const originalFetch = global.fetch;
(0, globals_1.describe)('HandoverProtocol', () => {
    let protocol;
    let registry;
    (0, globals_1.beforeAll)(async () => {
        registry = (0, partner_registry_js_1.getPartnerRegistry)();
        await registry.initialize();
    });
    (0, globals_1.afterAll)(async () => {
        await registry.shutdown();
    });
    (0, globals_1.beforeEach)(() => {
        protocol = new handover_protocol_js_1.HandoverProtocol({
            defaultTimeoutMs: 5000,
            maxRetries: 2,
            contextSizeLimit: 32000,
            enableEncryption: false,
            auditAllHandovers: true,
        });
    });
    (0, globals_1.describe)('session creation', () => {
        const createMockContext = () => ({
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
        (0, globals_1.it)('should create session with valid request', async () => {
            const request = {
                sessionId: 'session-001',
                sourceNation: 'EE',
                targetNation: 'FI',
                context: createMockContext(),
                priority: 'normal',
                timeoutMs: 5000,
            };
            // Mock successful handover response
            const fetchMock = globals_1.jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    sessionId: request.sessionId,
                    accepted: true,
                    targetSessionId: 'remote-session-001',
                    estimatedWaitMs: 0,
                }),
            }));
            global.fetch = fetchMock;
            const response = await protocol.initiateHandover(request);
            (0, globals_1.expect)(response.accepted).toBe(true);
            (0, globals_1.expect)(response.sessionId).toBe(request.sessionId);
            const [session] = protocol.getActiveSessions();
            (0, globals_1.expect)(session).toBeDefined();
            (0, globals_1.expect)(session?.originNation).toBe('EE');
            (0, globals_1.expect)(session?.targetNation).toBe('FI');
        });
        (0, globals_1.it)('should reject handover for unknown target nation', async () => {
            const request = {
                sessionId: 'session-002',
                sourceNation: 'EE',
                targetNation: 'XX',
                context: createMockContext(),
                priority: 'normal',
                timeoutMs: 5000,
            };
            await (0, globals_1.expect)(protocol.initiateHandover(request)).rejects.toThrow('Unknown target nation: XX');
        });
        (0, globals_1.it)('should reject handover for inactive partner', async () => {
            // Set Latvia to inactive
            await registry.updateStatus('LV', 'inactive');
            const request = {
                sessionId: 'session-003',
                sourceNation: 'EE',
                targetNation: 'LV',
                context: createMockContext(),
                priority: 'normal',
                timeoutMs: 5000,
            };
            const response = await protocol.initiateHandover(request);
            (0, globals_1.expect)(response.accepted).toBe(false);
            (0, globals_1.expect)(response.rejectionReason).toContain('not active');
        });
        (0, globals_1.it)('should reject handover when classification exceeds trust level', async () => {
            const context = createMockContext();
            context.dataClassification = 'top_secret';
            const request = {
                sessionId: 'session-004',
                sourceNation: 'EE',
                targetNation: 'FI',
                context,
                priority: 'normal',
                timeoutMs: 5000,
            };
            const response = await protocol.initiateHandover(request);
            (0, globals_1.expect)(response.accepted).toBe(false);
            (0, globals_1.expect)(response.rejectionReason).toContain('cannot handle');
        });
    });
    (0, globals_1.describe)('session acceptance', () => {
        const createMockContext = () => ({
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
        (0, globals_1.it)('should accept valid incoming handover', async () => {
            const request = {
                sessionId: 'incoming-001',
                sourceNation: 'EE',
                targetNation: 'FI',
                context: createMockContext(),
                priority: 'normal',
                timeoutMs: 5000,
            };
            const response = await protocol.acceptHandover(request);
            (0, globals_1.expect)(response.accepted).toBe(true);
            (0, globals_1.expect)(response.targetSessionId).toBeDefined();
            (0, globals_1.expect)(response.capabilities).toBeDefined();
        });
        (0, globals_1.it)('should reject handover from unknown source', async () => {
            const request = {
                sessionId: 'incoming-002',
                sourceNation: 'XX',
                targetNation: 'FI',
                context: createMockContext(),
                priority: 'normal',
                timeoutMs: 5000,
            };
            const response = await protocol.acceptHandover(request);
            (0, globals_1.expect)(response.accepted).toBe(false);
            (0, globals_1.expect)(response.rejectionReason).toContain('not recognized');
        });
    });
    (0, globals_1.describe)('session lifecycle', () => {
        (0, globals_1.it)('should track active sessions', async () => {
            const request = {
                sessionId: 'lifecycle-001',
                sourceNation: 'EE',
                targetNation: 'FI',
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
            (0, globals_1.expect)(activeSessions.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should complete session', async () => {
            const request = {
                sessionId: 'lifecycle-002',
                sourceNation: 'EE',
                targetNation: 'FI',
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
            (0, globals_1.expect)(response.targetSessionId).toBeDefined();
            await protocol.completeSession(response.targetSessionId);
            // Session should be deleted (deleteOnCompletion: true)
            const session = protocol.getSession(response.targetSessionId);
            (0, globals_1.expect)(session).toBeUndefined();
        });
    });
    (0, globals_1.describe)('context sanitization', () => {
        (0, globals_1.it)('should redact sensitive entity types', async () => {
            const fetchMock = globals_1.jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    sessionId: 'sanitize-001',
                    accepted: true,
                    targetSessionId: 'remote-sanitize-001',
                }),
            }));
            global.fetch = fetchMock;
            const request = {
                sessionId: 'sanitize-001',
                sourceNation: 'EE',
                targetNation: 'FI',
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
            (0, globals_1.expect)(fetchMock).toHaveBeenCalled();
            const fetchCall = fetchMock.mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body);
            // SSN should be redacted
            const ssnEntity = body.context.entities.find((e) => e.type === 'ssn');
            (0, globals_1.expect)(ssnEntity.value).toBe('[REDACTED]');
            (0, globals_1.expect)(ssnEntity.redacted).toBe(true);
            // Name should not be redacted
            const nameEntity = body.context.entities.find((e) => e.type === 'name');
            (0, globals_1.expect)(nameEntity.value).toBe('John Doe');
        });
    });
    (0, globals_1.afterEach)(() => {
        global.fetch = originalFetch;
    });
});
