"use strict";
/**
 * Schema validation tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/schemas/index.js");
(0, vitest_1.describe)('BaseEventSchema', () => {
    (0, vitest_1.it)('should validate a valid base event', () => {
        const event = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'test.event',
            source: 'test-source',
            classification: 'internal',
            isSynthetic: true,
        };
        const result = index_js_1.BaseEventSchema.safeParse(event);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('should require isSynthetic to be true', () => {
        const event = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'test.event',
            source: 'test-source',
            isSynthetic: false,
        };
        const result = index_js_1.BaseEventSchema.safeParse(event);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('NetworkFlowSchema', () => {
    (0, vitest_1.it)('should validate a valid network flow', () => {
        const flow = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'network.flow',
            source: { ip: '192.0.2.1', port: 12345 },
            destination: { ip: '203.0.113.1', port: 443 },
            protocol: 'tcp',
            direction: 'outbound',
            bytesIn: 1000,
            bytesOut: 5000,
            packetsIn: 10,
            packetsOut: 50,
            durationMs: 1500,
            startTime: '2024-01-15T10:30:00.000Z',
            endTime: '2024-01-15T10:30:01.500Z',
            action: 'allow',
            isSynthetic: true,
        };
        const result = index_js_1.NetworkFlowSchema.safeParse(flow);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('DnsEventSchema', () => {
    (0, vitest_1.it)('should validate a valid DNS event', () => {
        const dns = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'network.dns',
            source: 'dns-resolver',
            queryName: 'example.com',
            queryType: 'A',
            responseCode: 'NOERROR',
            clientAddress: { ip: '10.0.0.100' },
            queryTimeMs: 5.5,
            isSynthetic: true,
        };
        const result = index_js_1.DnsEventSchema.safeParse(dns);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('AuthEventSchema', () => {
    (0, vitest_1.it)('should validate a valid auth event', () => {
        const auth = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'identity.auth',
            source: 'idp',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            username: 'test.user',
            authMethod: 'mfa_totp',
            result: 'success',
            clientAddress: { ip: '10.0.0.50' },
            identityProvider: 'okta',
            targetApplication: 'portal',
            isSynthetic: true,
        };
        const result = index_js_1.AuthEventSchema.safeParse(auth);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('ProcessEventSchema', () => {
    (0, vitest_1.it)('should validate a valid process event', () => {
        const proc = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'endpoint.process',
            source: 'edr-agent',
            hostId: 'host-001',
            hostname: 'ws-001.corp.example',
            action: 'created',
            processId: 1234,
            processName: 'chrome.exe',
            processPath: 'C:\\Program Files\\Google\\Chrome\\chrome.exe',
            commandLine: 'chrome.exe --profile-directory=Default',
            userName: 'test.user',
            isSynthetic: true,
        };
        const result = index_js_1.ProcessEventSchema.safeParse(proc);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('IamEventSchema', () => {
    (0, vitest_1.it)('should validate a valid IAM event', () => {
        const iam = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: '2024-01-15T10:30:00.000Z',
            eventType: 'cloud.iam',
            source: 'cloudtrail',
            provider: 'aws',
            action: 'role_assumed',
            actorId: 'user-001',
            actorType: 'user',
            actorName: 'test.user',
            success: true,
            accountId: '123456789012',
            isSynthetic: true,
        };
        const result = index_js_1.IamEventSchema.safeParse(iam);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
