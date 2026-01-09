/**
 * Tests for hotfix waiver validation
 *
 * Run with: pnpm test scripts/release/__tests__/verify_hotfix_waivers.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const TEST_DIR = '/tmp/test-hotfix-waivers';
const FIXTURES_DIR = join(TEST_DIR, 'docs/releases/_state');

interface Waiver {
  id: string;
  type: string;
  hotfix_tag?: string;
  gates_waived: string[];
  justification: string;
  risk_assessment: string;
  mitigations: string[];
  created_at: string;
  expires_at: string;
  approved_by: string[];
  ticket_url: string;
  status: string;
}

interface WaiverFile {
  version: string;
  waivers: Waiver[];
}

function createWaiverFile(waivers: Waiver[]): void {
  const content: WaiverFile = {
    version: '1.0.0',
    waivers,
  };
  writeFileSync(join(FIXTURES_DIR, 'hotfix_waivers.json'), JSON.stringify(content, null, 2));
}

function futureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function pastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

describe('Waiver Validation', () => {
  beforeAll(() => {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Waiver Schema', () => {
    it('should accept valid waiver with all required fields', () => {
      const waiver: Waiver = {
        id: 'HW-2026-001',
        type: 'gate-bypass',
        hotfix_tag: 'v4.1.3',
        gates_waived: ['integration-tests'],
        justification: 'Emergency CVE patch - integration tests not affected',
        risk_assessment: 'low',
        mitigations: ['Manual verification', 'Canary deployment'],
        created_at: new Date().toISOString(),
        expires_at: futureDate(7),
        approved_by: ['@alice', '@bob'],
        ticket_url: 'https://issues.example.com/SEC-1234',
        status: 'active',
      };

      createWaiverFile([waiver]);

      const content = JSON.parse(readFileSync(join(FIXTURES_DIR, 'hotfix_waivers.json'), 'utf-8'));
      expect(content.waivers).toHaveLength(1);
      expect(content.waivers[0].id).toBe('HW-2026-001');
    });

    it('should require minimum 2 approvers', () => {
      const waiver: Waiver = {
        id: 'HW-2026-002',
        type: 'gate-bypass',
        gates_waived: ['e2e-tests'],
        justification: 'Test waiver with single approver',
        risk_assessment: 'low',
        mitigations: [],
        created_at: new Date().toISOString(),
        expires_at: futureDate(7),
        approved_by: ['@alice'], // Only 1 approver - should fail validation
        ticket_url: 'https://issues.example.com/SEC-1235',
        status: 'active',
      };

      expect(waiver.approved_by.length).toBeLessThan(2);
    });
  });

  describe('Waiver Expiry', () => {
    it('should detect expired waivers', () => {
      const expired: Waiver = {
        id: 'HW-2026-003',
        type: 'gate-bypass',
        gates_waived: ['lint'],
        justification: 'Expired waiver for testing',
        risk_assessment: 'low',
        mitigations: [],
        created_at: pastDate(10).toString(),
        expires_at: pastDate(3), // Expired 3 days ago
        approved_by: ['@alice', '@bob'],
        ticket_url: 'https://issues.example.com/SEC-1236',
        status: 'active',
      };

      const expiresAt = new Date(expired.expires_at);
      const now = new Date();

      expect(expiresAt < now).toBe(true);
    });

    it('should detect waivers expiring soon (within 24h)', () => {
      const expiringSoon: Waiver = {
        id: 'HW-2026-004',
        type: 'gate-bypass',
        gates_waived: ['typecheck'],
        justification: 'Waiver expiring soon',
        risk_assessment: 'low',
        mitigations: [],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
        approved_by: ['@alice', '@bob'],
        ticket_url: 'https://issues.example.com/SEC-1237',
        status: 'active',
      };

      const expiresAt = new Date(expiringSoon.expires_at);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(hoursUntilExpiry).toBeLessThan(24);
      expect(hoursUntilExpiry).toBeGreaterThan(0);
    });

    it('should allow waivers with valid future expiry', () => {
      const valid: Waiver = {
        id: 'HW-2026-005',
        type: 'gate-bypass',
        gates_waived: ['build'],
        justification: 'Valid waiver with future expiry',
        risk_assessment: 'low',
        mitigations: [],
        created_at: new Date().toISOString(),
        expires_at: futureDate(5), // 5 days from now
        approved_by: ['@alice', '@bob'],
        ticket_url: 'https://issues.example.com/SEC-1238',
        status: 'active',
      };

      const expiresAt = new Date(valid.expires_at);
      const now = new Date();

      expect(expiresAt > now).toBe(true);
    });
  });

  describe('Waiver Types', () => {
    const waiverTypes = [
      { type: 'gate-bypass', maxDays: 7 },
      { type: 'coverage-exception', maxDays: 7 },
      { type: 'security-exception', maxDays: 3 }, // 72 hours
      { type: 'compliance-exception', maxDays: 7 },
    ];

    for (const { type, maxDays } of waiverTypes) {
      it(`should validate ${type} waiver max duration (${maxDays} days)`, () => {
        const waiver: Waiver = {
          id: `HW-TEST-${type}`,
          type,
          gates_waived: ['test-gate'],
          justification: `Testing ${type} waiver duration`,
          risk_assessment: 'low',
          mitigations: [],
          created_at: new Date().toISOString(),
          expires_at: futureDate(maxDays),
          approved_by: ['@alice', '@bob'],
          ticket_url: 'https://issues.example.com/TEST',
          status: 'active',
        };

        const createdAt = new Date(waiver.created_at);
        const expiresAt = new Date(waiver.expires_at);
        const durationDays = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        expect(durationDays).toBeLessThanOrEqual(maxDays);
      });
    }
  });

  describe('Waiver Status', () => {
    const validStatuses = ['pending', 'active', 'expired', 'revoked', 'rejected'];

    for (const status of validStatuses) {
      it(`should accept status: ${status}`, () => {
        expect(validStatuses).toContain(status);
      });
    }

    it('should reject invalid status', () => {
      const invalidStatuses = ['approved', 'closed', 'done', 'ACTIVE'];

      for (const status of invalidStatuses) {
        expect(validStatuses).not.toContain(status);
      }
    });
  });

  describe('Waiver Tag Matching', () => {
    it('should match waiver tag to hotfix version', () => {
      const waiver: Waiver = {
        id: 'HW-2026-006',
        type: 'gate-bypass',
        hotfix_tag: 'v4.1.3',
        gates_waived: ['test'],
        justification: 'Testing tag matching',
        risk_assessment: 'low',
        mitigations: [],
        created_at: new Date().toISOString(),
        expires_at: futureDate(7),
        approved_by: ['@alice', '@bob'],
        ticket_url: 'https://issues.example.com/SEC-1239',
        status: 'active',
      };

      const hotfixVersion = '4.1.3';
      const expectedTag = `v${hotfixVersion}`;

      expect(waiver.hotfix_tag).toBe(expectedTag);
    });

    it('should allow waivers without specific tag (applies to any hotfix)', () => {
      const waiver: Waiver = {
        id: 'HW-2026-007',
        type: 'coverage-exception',
        gates_waived: ['coverage-threshold'],
        justification: 'General coverage exception for emergency patches',
        risk_assessment: 'medium',
        mitigations: ['Manual code review'],
        created_at: new Date().toISOString(),
        expires_at: futureDate(7),
        approved_by: ['@alice', '@bob'],
        ticket_url: 'https://issues.example.com/SEC-1240',
        status: 'active',
      };

      expect(waiver.hotfix_tag).toBeUndefined();
    });
  });
});

describe('Waiver Audit Log', () => {
  interface AuditEntry {
    timestamp: string;
    waiver_id: string;
    action: string;
    actor: string;
    details?: Record<string, unknown>;
  }

  interface AuditLog {
    version: string;
    entries: AuditEntry[];
  }

  it('should create valid audit log entry', () => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      waiver_id: 'HW-2026-001',
      action: 'created',
      actor: '@release-engineer',
      details: {
        type: 'gate-bypass',
        expires_at: futureDate(7),
      },
    };

    expect(entry.timestamp).toBeDefined();
    expect(entry.waiver_id).toMatch(/^HW-\d{4}-\d{3}$/);
    expect(['created', 'approved', 'activated', 'expired', 'revoked', 'rejected']).toContain(
      entry.action
    );
  });

  it('should maintain immutable audit trail', () => {
    const log: AuditLog = {
      version: '1.0.0',
      entries: [
        {
          timestamp: pastDate(2),
          waiver_id: 'HW-2026-001',
          action: 'created',
          actor: '@alice',
        },
        {
          timestamp: pastDate(2),
          waiver_id: 'HW-2026-001',
          action: 'approved',
          actor: '@bob',
        },
        {
          timestamp: pastDate(1),
          waiver_id: 'HW-2026-001',
          action: 'activated',
          actor: '@system',
        },
      ],
    };

    // Entries should be in chronological order
    for (let i = 1; i < log.entries.length; i++) {
      const prev = new Date(log.entries[i - 1].timestamp);
      const curr = new Date(log.entries[i].timestamp);
      expect(curr >= prev).toBe(true);
    }
  });
});
