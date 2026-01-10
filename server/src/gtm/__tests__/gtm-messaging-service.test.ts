import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { mkdtempSync } from 'fs';
import os from 'os';
import path from 'path';
import { ClaimsRepository } from '../claims-repository.js';
import { GtmMessagingService } from '../gtm-messaging-service.js';
import { ClaimStatus, EvidenceType, RiskTier } from '../types.js';

const createService = async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'gtm-claims-'));
  const repository = new ClaimsRepository(tempDir);
  await repository.init();
  const service = new GtmMessagingService(repository);
  return { service, repository };
};

describe('GtmMessagingService', () => {
  it('enforces high-risk approval workflow', async () => {
    const { service } = await createService();
    const { claim, enforcement } = await service.submitClaim({
      message: 'Forward-looking roadmap claim',
      evidenceType: EvidenceType.DemoVideo,
      evidenceSource: 'Roadmap demo',
      owner: 'PMM',
      channels: ['web', 'sales'],
      riskTier: RiskTier.High,
      forwardLooking: true,
      complianceSurface: ['security'],
    });

    expect(claim.status).toBe(ClaimStatus.Pending);
    expect(enforcement).toEqual(expect.arrayContaining(['legal approval', 'security approval', 'pmm final approval']));

    await service.recordApproval(claim.claimId, 'legal');
    await service.recordApproval(claim.claimId, 'security');
    const approved = await service.recordApproval(claim.claimId, 'pmm');

    expect(approved.status).toBe(ClaimStatus.Approved);
    expect(approved.publishedAt).toBeDefined();
  });

  it('expires claims past review date', async () => {
    const { service, repository } = await createService();
    const { claim } = await service.submitClaim({
      message: 'Customer metric proof with SLA',
      evidenceType: EvidenceType.CustomerMetric,
      evidenceSource: 'Case study',
      owner: 'Marketing',
      channels: ['content'],
      riskTier: RiskTier.Low,
      reviewDate: '2000-01-01T00:00:00.000Z',
    });
    await service.recordApproval(claim.claimId, 'pmm');
    const expired = await service.expireClaims(new Date('2001-01-01T00:00:00.000Z'));
    expect(expired).toHaveLength(1);
    const stored = (await repository.loadClaims())[0];
    expect(stored.status).toBe(ClaimStatus.Expired);
  });

  it('produces templates, KPIs, and enablement assets aligned to governance guardrails', async () => {
    const { service } = await createService();
    const templates = service.getContentTemplates();
    expect(templates.find((t) => t.type === 'case_study')?.proofRequirements).toContain('Named customer metric');

    const kpis = service.getWebsiteKpis();
    expect(kpis.find((kpi) => kpi.page === 'home')?.abGuardrails).toContain('Sample size calculator required');

    const enablement = service.getEnablementAssets();
    expect(enablement.find((asset) => asset.role === 'ae' && asset.assetType === 'battlecard')?.forbiddenPhrases).toContain(
      'perfect security',
    );
  });

  it('builds an execution checklist and evidence graph from approved claims', async () => {
    const { service } = await createService();
    const { claim } = await service.submitClaim({
      message: 'Evidence-grade reporting SLA',
      evidenceType: EvidenceType.Sla,
      evidenceSource: 'SLA posture',
      owner: 'Legal',
      channels: ['web'],
      riskTier: RiskTier.Medium,
    });
    await service.recordApproval(claim.claimId, 'pmm');
    const claims = await service.listClaimsForChannel('web');
    const checklist = service.buildExecutionChecklist(claims);
    expect(checklist.find((item) => item.id === 'claims_library')?.completed).toBe(true);

    const graph = service.buildEvidenceGraph(claims);
    expect(graph).toHaveLength(1);
    expect(graph[0].claimId).toBe(claim.claimId);
  });

  it('evaluates channel performance against playbook thresholds', async () => {
    const { service } = await createService();
    const result = service.evaluateChannelPerformance({
      channel: 'content',
      cac: 400,
      paybackMonths: 3,
      pipelineVelocity: 0.2,
    });
    expect(result.healthy).toBe(true);
    expect(result.recommendation).toBe('double_down');
  });

  it('routes personas adaptively based on intent and behavior', async () => {
    const { service } = await createService();
    const route = service.decideAdaptiveRoute({ behavioralScore: 0.8, firmographic: 'enterprise', intentLevel: 'high' });
    expect(route).toBe('enterprise-contact');
  });

  it('flags unapproved claims and forbidden phrases through QA scanning', async () => {
    const { service } = await createService();
    const approved = await service.submitClaim({
      message: 'Approved governance proof',
      evidenceType: EvidenceType.ProductTelemetry,
      evidenceSource: 'Telemetry dataset',
      owner: 'Ops',
      channels: ['web'],
      riskTier: RiskTier.Low,
    });
    await service.recordApproval(approved.claim.claimId, 'pmm');

    await service.submitClaim({
      message: 'Unapproved forward-looking statement',
      evidenceType: EvidenceType.DemoVideo,
      evidenceSource: 'Future demo',
      owner: 'PMM',
      channels: ['web'],
      riskTier: RiskTier.High,
      forwardLooking: true,
    });

    const qa = await service.closedLoopQa(
      'This asset cites an Unapproved forward-looking statement and promises guaranteed outcomes while covering the approved governance proof.',
    );
    expect(qa.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Unapproved claim referenced'),
        'Forbidden phrase detected: guaranteed',
      ]),
    );
  });
});
