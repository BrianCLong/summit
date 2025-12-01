/**
 * Schema validation tests
 */

import { describe, it, expect } from 'vitest';
import {
  BaseEventSchema,
  NetworkFlowSchema,
  DnsEventSchema,
  AuthEventSchema,
  ProcessEventSchema,
  IamEventSchema,
} from '../src/schemas/index.js';

describe('BaseEventSchema', () => {
  it('should validate a valid base event', () => {
    const event = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2024-01-15T10:30:00.000Z',
      eventType: 'test.event',
      source: 'test-source',
      classification: 'internal',
      isSynthetic: true,
    };

    const result = BaseEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('should require isSynthetic to be true', () => {
    const event = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2024-01-15T10:30:00.000Z',
      eventType: 'test.event',
      source: 'test-source',
      isSynthetic: false,
    };

    const result = BaseEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe('NetworkFlowSchema', () => {
  it('should validate a valid network flow', () => {
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

    const result = NetworkFlowSchema.safeParse(flow);
    expect(result.success).toBe(true);
  });
});

describe('DnsEventSchema', () => {
  it('should validate a valid DNS event', () => {
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

    const result = DnsEventSchema.safeParse(dns);
    expect(result.success).toBe(true);
  });
});

describe('AuthEventSchema', () => {
  it('should validate a valid auth event', () => {
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

    const result = AuthEventSchema.safeParse(auth);
    expect(result.success).toBe(true);
  });
});

describe('ProcessEventSchema', () => {
  it('should validate a valid process event', () => {
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

    const result = ProcessEventSchema.safeParse(proc);
    expect(result.success).toBe(true);
  });
});

describe('IamEventSchema', () => {
  it('should validate a valid IAM event', () => {
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

    const result = IamEventSchema.safeParse(iam);
    expect(result.success).toBe(true);
  });
});
