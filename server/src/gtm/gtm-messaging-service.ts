import { randomUUID } from 'crypto';
import { Counter, Gauge, Histogram, register } from 'prom-client';
import { ClaimsRepository } from './claims-repository.js';
import {
  ApprovalRole,
  Channel,
  Claim,
  ClaimInput,
  ClaimInputSchema,
  ClaimStatus,
  ContentTemplate,
  EvidenceGraphLink,
  EvidenceType,
  ExecutionChecklistItem,
  IcpBrief,
  MessageHouse,
  NurtureTrack,
  RiskTier,
  WebsiteKpiConfig,
  EnablementAsset,
  ChannelPlaybook,
} from './types.js';

interface AdaptiveRoutingInput {
  behavioralScore: number;
  firmographic: 'smb' | 'mid-market' | 'enterprise';
  intentLevel: 'low' | 'medium' | 'high';
}

interface SubmitClaimResult {
  claim: Claim;
  enforcement: string[];
}

interface ChannelPerformanceInput {
  channel: ChannelPlaybook['channel'];
  cac: number;
  paybackMonths: number;
  pipelineVelocity: number;
}

export class GtmMessagingService {
  private repository: ClaimsRepository;

  private static getOrCreateCounter(config: any): Counter<any> {
    const existing = register.getSingleMetric(config.name);
    if (existing) return existing as Counter<any>;
    return new Counter(config);
  }

  private static getOrCreateGauge(config: any): Gauge<any> {
    const existing = register.getSingleMetric(config.name);
    if (existing) return existing as Gauge<any>;
    return new Gauge(config);
  }

  private static getOrCreateHistogram(config: any): Histogram<any> {
    const existing = register.getSingleMetric(config.name);
    if (existing) return existing as Histogram<any>;
    return new Histogram(config);
  }

  private static claimsSubmitted = GtmMessagingService.getOrCreateCounter({
    name: 'gtm_claims_submitted_total',
    help: 'Count of claims submitted by risk tier',
    labelNames: ['riskTier'] as const,
  });
  private static claimsApproved = GtmMessagingService.getOrCreateCounter({
    name: 'gtm_claims_approved_total',
    help: 'Count of claims approved by risk tier',
    labelNames: ['riskTier'] as const,
  });
  private static claimsExpired = GtmMessagingService.getOrCreateCounter({
    name: 'gtm_claims_expired_total',
    help: 'Count of claims that hit expiry',
    labelNames: ['riskTier'] as const,
  });
  private static approvalDuration = GtmMessagingService.getOrCreateHistogram({
    name: 'gtm_claim_approval_duration_seconds',
    help: 'Time from submission to approval',
    labelNames: ['riskTier'] as const,
    buckets: [0.5, 1, 3, 6, 12, 24, 48, 72, 96],
  });
  private static activeApprovedClaims = GtmMessagingService.getOrCreateGauge({
    name: 'gtm_claims_active',
    help: 'Active approved claims per channel',
    labelNames: ['channel'] as const,
  });

  static resetMetrics() {
    this.claimsSubmitted.reset();
    this.claimsApproved.reset();
    this.claimsExpired.reset();
    this.approvalDuration.reset();
    this.activeApprovedClaims.reset();
  }

  constructor(repository = new ClaimsRepository()) {
    this.repository = repository;
  }

  async submitClaim(input: ClaimInput): Promise<SubmitClaimResult> {
    const parsed = ClaimInputSchema.parse(input);
    const riskTier = parsed.riskTier ?? this.calculateRiskTier(parsed);
    const now = new Date();
    const reviewDate = parsed.reviewDate ?? this.computeReviewDate(riskTier, now);
    const claim: Claim = {
      claimId: randomUUID(),
      message: parsed.message,
      evidenceType: parsed.evidenceType,
      evidenceSource: parsed.evidenceSource,
      status: ClaimStatus.Pending,
      reviewDate,
      owner: parsed.owner,
      channels: parsed.channels,
      riskTier,
      approvals: [
        {
          approver: 'evidence',
          approvedAt: now.toISOString(),
          notes: 'Evidence validated at submission',
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      forwardLooking: parsed.forwardLooking,
      complianceSurface: parsed.complianceSurface,
    };
    await this.repository.upsertClaim(claim);
    GtmMessagingService.claimsSubmitted.inc({ riskTier: claim.riskTier });
    return {
      claim,
      enforcement: this.computeEnforcementGates(claim),
    };
  }

  async recordApproval(claimId: string, approver: ApprovalRole, notes?: string): Promise<Claim> {
    const claims = await this.repository.loadClaims();
    const claim = claims.find((c) => c.claimId === claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    if (claim.status === ClaimStatus.Expired) {
      throw new Error('Cannot approve an expired claim');
    }
    const now = new Date();
    claim.approvals = [...claim.approvals, { approver, approvedAt: now.toISOString(), notes }];
    claim.updatedAt = now.toISOString();

    const approvalsNeeded = this.requiredApprovals(claim);
    const approvalsMet = approvalsNeeded.every((required) =>
      claim.approvals.some((approval) => approval.approver === required),
    );

    if (approvalsMet) {
      claim.status = ClaimStatus.Approved;
      claim.publishedAt = claim.publishedAt ?? now.toISOString();
      GtmMessagingService.claimsApproved.inc({ riskTier: claim.riskTier });
      const submissionTime = new Date(claim.createdAt).getTime();
      GtmMessagingService.approvalDuration.observe({ riskTier: claim.riskTier }, (now.getTime() - submissionTime) / 1000 / 3600);
      await this.updateActiveClaimsGauge();
    }

    await this.repository.upsertClaim(claim);
    return claim;
  }

  async expireClaims(currentDate: Date = new Date()): Promise<Claim[]> {
    const claims = await this.repository.loadClaims();
    const updated = claims.map((claim) => {
      if (claim.status === ClaimStatus.Approved && new Date(claim.reviewDate) < currentDate) {
        GtmMessagingService.claimsExpired.inc({ riskTier: claim.riskTier });
        return { ...claim, status: ClaimStatus.Expired, expiry: currentDate.toISOString(), updatedAt: currentDate.toISOString() };
      }
      return claim;
    });
    await this.repository.saveClaims(updated);
    await this.updateActiveClaimsGauge();
    return updated.filter((claim) => claim.status === ClaimStatus.Expired);
  }

  async listClaimsForChannel(channel: Channel): Promise<Claim[]> {
    const claims = await this.repository.loadClaims();
    return claims.filter((claim) => claim.status === ClaimStatus.Approved && claim.channels.includes(channel));
  }

  async getMessageHouse(): Promise<MessageHouse> {
    return {
      core: {
        headline: 'Governed AI outcomes with evidence-grade reporting',
        proofPoints: [
          'SOC2+ enterprise controls with provenance ledger',
          'Case studies with 30% faster investigations',
          'SLA-backed response with audit-ready exports',
        ],
        objections: ['Data residency', 'Security posture', 'ROI proof', 'Vendor lock-in'],
        differentiators: [
          'AI-first + governance-first architecture',
          'Provenance ledger enforcing policy-driven controls',
          'Self-hostable with data isolation patterns',
        ],
      },
      variants: [
        {
          name: 'regulated',
          headline: 'Regulated teams: audit-grade AI with FedRAMP-ready controls',
          proofPoints: ['FedRAMP-ready patterns', 'Data isolation with DLP posture', 'Regional tenancy + retention SLAs'],
          objections: ['Cross-border data flow', 'Chain-of-custody', 'Regulatory drift'],
          differentiators: ['Continuous compliance checks', 'Security packet for regulators', 'Signed audit artifacts'],
          additionalControls: ['Mandatory legal + security approvals for new claims'],
        },
        {
          name: 'mid-market',
          headline: 'Mid-market: consolidate rogue tools with evidence-backed AI',
          proofPoints: ['SOC2 posture', 'Fast-start templates', 'Shared enablement library'],
          objections: ['Change management', 'Proof of ROI'],
          differentiators: ['Fast lane approvals', 'Template-driven launches', 'Integrated nurture'],
          additionalControls: ['Fast-lane reuse of approved claims'],
        },
        {
          name: 'enterprise',
          headline: 'Enterprise: policy-automated AI that scales globally',
          proofPoints: ['Global routing and consent', 'Attribution sanity checks', 'Battle-tested SLAs'],
          objections: ['Integration risk', 'Data mapping', 'Security review cycle time'],
          differentiators: ['Mutual action plans', 'Platform extensibility', 'Governance-first pipelines'],
          additionalControls: ['Dual approvals for forward-looking statements'],
        },
      ],
    };
  }

  async getIcpBrief(): Promise<IcpBrief> {
    return {
      tiers: [
        {
          name: 'regulated',
          criteria: ['Regulated industry', 'Strict data residency', 'Security-first'],
          triggers: ['Audit cycles', 'New AI governance policy', 'Incident-driven refresh'],
          pains: ['Rogue tools', 'Compliance exposure', 'Slow approvals'],
          valueHypotheses: ['Faster approvals', 'Audit-ready reporting', 'Reduced risk'],
          proofSources: ['Regulated customer metrics', 'Certifications', 'Security attestations'],
        },
        {
          name: 'mid-market',
          criteria: ['Growing teams', 'Limited RevOps resources'],
          triggers: ['Need to consolidate tools', 'Desire for faster close rates'],
          pains: ['Inconsistent messaging', 'Manual content production'],
          valueHypotheses: ['Single source of truth messaging', 'Reusable templates', 'Enablement discipline'],
          proofSources: ['Customer quotes', 'ROI metrics', 'Demo video proof'],
        },
        {
          name: 'enterprise',
          criteria: ['Global footprint', 'Complex compliance'],
          triggers: ['Board pressure on AI governance', 'Global rollouts'],
          pains: ['Channel drift', 'Attribution uncertainty'],
          valueHypotheses: ['Policy automation', 'Persona routing', 'Multi-touch attribution'],
          proofSources: ['Executive references', 'SLA adherence metrics', 'Security attestations'],
        },
      ],
      useCases: ['Investigation workspace', 'Evidence-grade reporting', 'Policy automation', 'Executive command center'],
      whyNow: [
        'AI governance requirements and provenance expectations',
        'Audit demands for evidence-backed claims',
        'Need to consolidate rogue tools into a governed system',
      ],
    };
  }

  getContentTemplates(): ContentTemplate[] {
    return [
      {
        type: 'blog',
        requiredSections: ['Problem framing', 'Proof tile', 'CTA', 'FAQ'],
        callToAction: 'Book a demo tailored to your governance posture',
        proofRequirements: ['At least one approved claim', 'Link to evidence tile'],
        reusePlan: ['Social snippets', 'Newsletter highlight', 'Nurture email'],
      },
      {
        type: 'case_study',
        requiredSections: ['Customer background', 'Problem', 'Solution', 'Proof metrics', 'Security posture'],
        callToAction: 'See the workflow live with your data',
        proofRequirements: ['Named customer metric', 'Approved claim mapping'],
        reusePlan: ['Deck tile', 'Sales one-pager', 'Web proof gallery'],
      },
      {
        type: 'whitepaper',
        requiredSections: ['Executive summary', 'Architecture', 'Proof appendix', 'Compliance mapping'],
        callToAction: 'Download the governed AI blueprint',
        proofRequirements: ['Certification references', 'SLA commitments'],
        reusePlan: ['Webinar script', 'FAQ', 'Security packet addendum'],
      },
      {
        type: 'webinar',
        requiredSections: ['Agenda', 'Live demo', 'Proof gallery', 'Q&A', 'Next steps'],
        callToAction: 'Register for the guided governance demo',
        proofRequirements: ['Demo video', 'Customer quote'],
        reusePlan: ['Clips', 'Social posts', 'FAQ', 'Deck updates', 'Nurture emails'],
      },
      {
        type: 'docs',
        requiredSections: ['Feature overview', 'Controls', 'Proof references', 'Compliance notes'],
        callToAction: 'Enable the control in your workspace',
        proofRequirements: ['Product telemetry reference'],
        reusePlan: ['Release notes', 'Support macros'],
      },
      {
        type: 'email',
        requiredSections: ['Personalized hook', 'Proof tile', 'CTA'],
        callToAction: 'Book the governance session',
        proofRequirements: ['Approved claim matched to persona'],
        reusePlan: ['Sequence templates', 'Nurture variants'],
      },
    ];
  }

  getWebsiteKpis(): WebsiteKpiConfig[] {
    return [
      {
        page: 'home',
        metrics: [
          { name: 'ctr_to_pricing_or_use_case', target: 0.35, description: 'Clickthrough to pricing or use case pages' },
          { name: 'demo_request_rate', target: 0.07, description: 'Demo request rate from home' },
        ],
        routing: ['persona routing enabled', 'route SMB to self-serve, enterprise to contact'],
        abGuardrails: ['Guardrail brand variants', 'Sample size calculator required'],
      },
      {
        page: 'pricing',
        metrics: [
          { name: 'plan_clickthrough', target: 0.5, description: 'Clickthrough to contact or sign-up' },
          { name: 'contact_rate', target: 0.12, description: 'Contact sales submissions from pricing' },
        ],
        routing: ['capture friction notes', 'instrument drop-offs'],
        abGuardrails: ['Limit concurrent tests to 2', 'Preserve trust surfaces'],
      },
      {
        page: 'use_case',
        metrics: [
          { name: 'cta_to_demo_or_signup', target: 0.2, description: 'CTA performance per use case' },
          { name: 'proof_engagement', target: 0.4, description: 'Interaction with proof tiles' },
        ],
        abGuardrails: ['Variants must reuse approved claims', 'No unapproved forward-looking statements'],
      },
      {
        page: 'security',
        metrics: [
          { name: 'trust_pack_download', target: 0.25, description: 'Download rate for trust pack' },
          { name: 'sla_view_depth', target: 0.3, description: 'View depth for SLA posture content' },
        ],
        routing: ['Enterprise route to contact', 'Alert on drop-offs'],
        abGuardrails: ['No brand drift', 'Security claims must be approved and unexpired'],
      },
    ];
  }

  getNurtureTracks(): NurtureTrack[] {
    return [
      {
        name: 'New lead onboarding',
        stage: 'new_lead',
        signals: ['form_submission', 'light content depth'],
        content: ['Welcome email', 'Primary proof tile', 'CTA to demo scheduling'],
      },
      {
        name: 'Engaged to activated',
        stage: 'engaged',
        signals: ['content depth', 'product interest'],
        content: ['Use-case specific guide', 'Proof-linked nurture email', 'Webinar invite'],
      },
      {
        name: 'SQL reinforcement',
        stage: 'sql',
        signals: ['sales accepted', 'security questionnaire'],
        content: ['Security packet', 'Battlecard', 'Mutual action plan'],
      },
      {
        name: 'Expansion',
        stage: 'expansion',
        signals: ['feature adoption', 'renewal window'],
        content: ['Expansion playbook', 'New feature adoption campaign'],
      },
    ];
  }

  getEnablementAssets(): EnablementAsset[] {
    return [
      { role: 'sdr', assetType: 'deck', required: true, forbiddenPhrases: ['magic ai', 'guaranteed'] },
      { role: 'ae', assetType: 'battlecard', required: true, forbiddenPhrases: ['unlimited', 'perfect security'] },
      { role: 'se', assetType: 'demo', required: true },
      { role: 'csm', assetType: 'map', required: true },
      { role: 'ae', assetType: 'security_packet', required: true },
      { role: 'sdr', assetType: 'objection_handling' },
    ];
  }

  getChannelPlaybooks(): ChannelPlaybook[] {
    return [
      {
        channel: 'paid_search',
        cacTarget: 1200,
        paybackTargetMonths: 6,
        killThreshold: 0.2,
        attributionModel: 'multi_touch',
        complianceRequirements: ['Consent tracking', 'UTM discipline'],
      },
      {
        channel: 'content',
        cacTarget: 500,
        paybackTargetMonths: 4,
        killThreshold: 0.15,
        attributionModel: 'multi_touch',
        complianceRequirements: ['Approval for claims', 'Accessibility review'],
      },
      {
        channel: 'events',
        cacTarget: 1500,
        paybackTargetMonths: 9,
        killThreshold: 0.1,
        attributionModel: 'multi_touch',
        complianceRequirements: ['Consent', 'Badge scan governance'],
      },
      {
        channel: 'partners',
        cacTarget: 800,
        paybackTargetMonths: 7,
        killThreshold: 0.18,
        attributionModel: 'multi_touch',
        complianceRequirements: ['MDF rules', 'Co-marketing approvals'],
      },
      {
        channel: 'outbound',
        cacTarget: 900,
        paybackTargetMonths: 5,
        killThreshold: 0.12,
        attributionModel: 'multi_touch',
        complianceRequirements: ['Outreach compliance', 'Security-approved language'],
      },
      {
        channel: 'plg',
        cacTarget: 300,
        paybackTargetMonths: 3,
        killThreshold: 0.25,
        attributionModel: 'multi_touch',
        complianceRequirements: ['Product telemetry opt-in', 'Consent management'],
      },
    ];
  }

  evaluateChannelPerformance(input: ChannelPerformanceInput) {
    const playbook = this.getChannelPlaybooks().find((p) => p.channel === input.channel);
    if (!playbook) {
      throw new Error(`Unknown channel ${input.channel}`);
    }
    const healthy =
      input.cac <= playbook.cacTarget &&
      input.paybackMonths <= playbook.paybackTargetMonths &&
      input.pipelineVelocity >= playbook.killThreshold;
    return {
      healthy,
      recommendation: healthy ? 'double_down' : 'reallocate_budget',
    };
  }

  decideAdaptiveRoute(input: AdaptiveRoutingInput): 'self-serve' | 'guided-demo' | 'enterprise-contact' {
    if (input.intentLevel === 'high' && input.behavioralScore >= 0.7) {
      return input.firmographic === 'enterprise' ? 'enterprise-contact' : 'guided-demo';
    }
    if (input.behavioralScore >= 0.4) {
      return 'guided-demo';
    }
    return 'self-serve';
  }

  async closedLoopQa(content: string): Promise<{ violations: string[] }> {
    const claims = await this.repository.loadClaims();
    const approvedMessages = claims
      .filter((claim) => claim.status === ClaimStatus.Approved)
      .map((claim) => claim.message.toLowerCase());
    const forbiddenPhrases = ['guaranteed', 'perfect security', 'unlimited'];
    const violations: string[] = [];

    claims
      .filter((claim) => claim.status !== ClaimStatus.Approved)
      .forEach((claim) => {
        if (content.toLowerCase().includes(claim.message.toLowerCase())) {
          violations.push(`Unapproved claim referenced: ${claim.claimId}`);
        }
      });

    forbiddenPhrases.forEach((phrase) => {
      if (content.toLowerCase().includes(phrase)) {
        violations.push(`Forbidden phrase detected: ${phrase}`);
      }
    });

    if (!approvedMessages.some((msg) => content.toLowerCase().includes(msg))) {
      violations.push('No approved claims found in content');
    }

    return { violations };
  }

  buildExecutionChecklist(claims: Claim[]): ExecutionChecklistItem[] {
    return [
      {
        id: 'icp_narrative',
        description: 'Publish ICP + why-now one-pager and message house variants',
        completed: claims.length > 0,
      },
      {
        id: 'claims_library',
        description: 'Stand up claims library with approval workflow, expiry, and channel tagging',
        completed: claims.some((claim) => claim.status === ClaimStatus.Approved),
      },
      {
        id: 'content_templates',
        description: 'Ship content templates with editorial standards and reuse playbook',
        completed: true,
      },
      {
        id: 'website_kpis',
        description: 'Map website KPIs and trust surfaces with guardrails',
        completed: true,
      },
      {
        id: 'nurture_scoring',
        description: 'Launch nurture and lead scoring with SLAs',
        completed: true,
      },
      {
        id: 'enablement_library',
        description: 'Refresh enablement library and certification',
        completed: claims.filter((claim) => claim.channels.includes('sales')).length > 0,
      },
      {
        id: 'channel_scorecards',
        description: 'Finalize channel scorecards and attribution sanity checks',
        completed: true,
      },
      {
        id: 'risk_register',
        description: 'Maintain risk register and exceptions registry',
        completed: true,
      },
    ];
  }

  buildEvidenceGraph(claims: Claim[]): EvidenceGraphLink[] {
    return claims
      .filter((claim) => claim.status === ClaimStatus.Approved)
      .flatMap((claim) =>
        claim.channels.map((channel) => ({
          claimId: claim.claimId,
          evidenceSource: claim.evidenceSource,
          channel,
          lastValidatedAt: claim.updatedAt,
          driftDetected: Boolean(claim.expiry && new Date(claim.expiry) < new Date()),
        })),
      );
  }

  private computeEnforcementGates(claim: Claim): string[] {
    const gates = ['evidence validation'];
    if (claim.riskTier === RiskTier.High) {
      gates.push('legal approval', 'security approval', 'pmm final approval');
    } else if (claim.riskTier === RiskTier.Medium) {
      gates.push('pmm approval');
    }
    if (claim.forwardLooking) {
      gates.push('forward-looking attestation');
    }
    return gates;
  }

  private requiredApprovals(claim: Claim): ApprovalRole[] {
    if (claim.riskTier === RiskTier.High || claim.forwardLooking) {
      return ['legal', 'security', 'pmm'];
    }
    if (claim.riskTier === RiskTier.Medium) {
      return ['pmm'];
    }
    return ['pmm'];
  }

  private calculateRiskTier(input: ClaimInput): RiskTier {
    if (input.forwardLooking || input.complianceSurface?.length) {
      return RiskTier.High;
    }
    if (input.channels.includes('web') && input.evidenceType === EvidenceType.DemoVideo) {
      return RiskTier.Medium;
    }
    return RiskTier.Low;
  }

  private computeReviewDate(riskTier: RiskTier, now: Date): string {
    const days = riskTier === RiskTier.High ? 90 : riskTier === RiskTier.Medium ? 120 : 180;
    const reviewDate = new Date(now);
    reviewDate.setDate(now.getDate() + days);
    return reviewDate.toISOString();
  }

  private async updateActiveClaimsGauge(): Promise<void> {
    const claims = await this.repository.loadClaims();
    const approved = claims.filter((claim) => claim.status === ClaimStatus.Approved);
    const counts: Record<Channel, number> = {
      web: 0,
      sales: 0,
      content: 0,
    };
    approved.forEach((claim) => {
      claim.channels.forEach((channel) => {
        counts[channel] += 1;
      });
    });
    (Object.keys(counts) as Channel[]).forEach((channel) => {
      GtmMessagingService.activeApprovedClaims.set({ channel }, counts[channel]);
    });
  }
}
