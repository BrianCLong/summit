import { describe, expect, it, beforeEach } from 'vitest';
import {
  PolicyOperatingBlueprint,
  createDefaultPolicyBlueprint,
  type ExceptionEntry,
  type RapidResponseTicket,
} from '../src/policy-blueprint.js';

describe('PolicyOperatingBlueprint', () => {
  let blueprint: PolicyOperatingBlueprint;

  beforeEach(() => {
    blueprint = new PolicyOperatingBlueprint(createDefaultPolicyBlueprint());
  });

  it('ranks threats by risk score with short timelines prioritized', () => {
    const ranked = blueprint.rankThreats();
    expect(ranked[0].id).toBe('threat-ai-act');
    expect(ranked.find((t) => t.id === 'threat-us-patchwork')!.riskScore).toBeGreaterThan(
      ranked.find((t) => t.id === 'threat-nis2-dora')!.riskScore,
    );
  });

  it('enforces 24h owner assignment SLA', () => {
    const lateAssignment = () =>
      blueprint.assignCalendarOwner(
        'calendar-ftc-ai',
        'Legal',
        new Date('2025-01-03T00:00:00Z'),
      );
    expect(lateAssignment).toThrow(/24h SLA/);
  });

  it('enforces 90-day exception expiry and dual approval', () => {
    const good: ExceptionEntry = {
      id: 'ok',
      owner: 'GC',
      scope: 'Privacy',
      deviation: 'Temporary logging',
      expiry: new Date('2025-03-15T00:00:00Z'),
      createdAt: new Date('2025-01-15T00:00:00Z'),
      compensatingControls: 'Access restrictions',
      approvedBy: ['GC', 'CISO'],
    };
    expect(() => blueprint.registerException(good)).not.toThrow();

    const overLimit: ExceptionEntry = {
      ...good,
      id: 'bad-expiry',
      expiry: new Date('2025-06-01T00:00:00Z'),
    };
    expect(() => blueprint.registerException(overLimit)).toThrow(/90-day/);

    const missingApproval: ExceptionEntry = {
      ...good,
      id: 'bad-approval',
      approvedBy: ['GC'],
    };
    expect(() => blueprint.registerException(missingApproval)).toThrow(/dual approval/);
  });

  it('flags stale stakeholders based on cadence', () => {
    const stale = blueprint.getStaleStakeholders(new Date('2025-04-10T00:00:00Z'));
    expect(stale.map((s) => s.id)).toContain('stakeholder-ftc');
  });

  it('enforces rapid response acknowledgment and path SLAs', () => {
    const ticket: RapidResponseTicket = {
      id: 'rr-1',
      description: 'Regulator inquiry',
      receivedAt: new Date('2025-01-05T00:00:00Z'),
      acknowledgedAt: new Date('2025-01-05T12:00:00Z'),
      pathStartedAt: new Date('2025-01-07T00:00:00Z'),
    };
    expect(() => blueprint.recordRapidResponse(ticket)).not.toThrow();

    const lateAck: RapidResponseTicket = {
      ...ticket,
      id: 'rr-2',
      acknowledgedAt: new Date('2025-01-07T00:00:00Z'),
    };
    expect(() => blueprint.recordRapidResponse(lateAck)).toThrow(/24h SLA/);

    const latePath: RapidResponseTicket = {
      ...ticket,
      id: 'rr-3',
      pathStartedAt: new Date('2025-01-10T00:00:00Z'),
    };
    expect(() => blueprint.recordRapidResponse(latePath)).toThrow(/72h SLA/);
  });

  it('produces quarterly brief with required sections', () => {
    const brief = blueprint.generateQuarterlyBrief(
      createDefaultPolicyBlueprint().governanceMetrics,
    );
    expect(brief.headlineRisks.length).toBeGreaterThan(0);
    expect(brief.jurisdictionScoreboard.length).toBeGreaterThan(0);
    expect(brief.engagementOutcomes.length).toBeGreaterThan(0);
    expect(brief.exceptions.length).toBeGreaterThan(0);
    expect(brief.metrics.roi.dealsEnabled).toBeGreaterThan(0);
  });
});
