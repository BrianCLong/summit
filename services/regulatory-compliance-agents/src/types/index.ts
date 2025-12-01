import { z } from 'zod';

// Regulation source types
export const RegulationSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['rss', 'api', 'scraper', 'webhook']),
  url: z.string().url(),
  jurisdiction: z.enum(['US', 'EU', 'UK', 'INTL', 'STATE']),
  categories: z.array(z.string()),
  pollingIntervalMinutes: z.number().default(60),
  enabled: z.boolean().default(true),
  lastChecked: z.date().optional(),
  credentials: z.record(z.string()).optional(),
});

export type RegulationSource = z.infer<typeof RegulationSourceSchema>;

// Regulation entity
export const RegulationSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  externalId: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  fullText: z.string().optional(),
  jurisdiction: z.enum(['US', 'EU', 'UK', 'INTL', 'STATE']),
  regulatoryBody: z.string(),
  categories: z.array(z.string()),
  effectiveDate: z.date().optional(),
  publishedDate: z.date(),
  status: z.enum(['draft', 'proposed', 'final', 'effective', 'superseded']),
  url: z.string().url(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Regulation = z.infer<typeof RegulationSchema>;

// Impact assessment
export const ImpactAssessmentSchema = z.object({
  id: z.string().uuid(),
  regulationId: z.string().uuid(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  impactAreas: z.array(z.object({
    area: z.string(),
    description: z.string(),
    affectedSystems: z.array(z.string()),
    requiredActions: z.array(z.string()),
    deadline: z.date().optional(),
  })),
  complianceGaps: z.array(z.object({
    gapId: z.string(),
    description: z.string(),
    currentState: z.string(),
    requiredState: z.string(),
    remediationSteps: z.array(z.string()),
    estimatedEffort: z.string(),
  })),
  riskScore: z.number().min(0).max(100),
  autoRemediationPossible: z.boolean(),
  recommendedActions: z.array(z.string()),
  assessedAt: z.date(),
  assessedBy: z.enum(['ai', 'human', 'hybrid']),
});

export type ImpactAssessment = z.infer<typeof ImpactAssessmentSchema>;

// Workflow adaptation
export const WorkflowAdaptationSchema = z.object({
  id: z.string().uuid(),
  regulationId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  adaptationType: z.enum([
    'policy_update',
    'workflow_modification',
    'data_handling_change',
    'access_control_change',
    'notification_rule',
    'audit_requirement',
    'retention_policy',
  ]),
  targetSystem: z.string(),
  changes: z.array(z.object({
    changeType: z.enum(['add', 'modify', 'remove']),
    component: z.string(),
    before: z.unknown().optional(),
    after: z.unknown(),
    rationale: z.string(),
  })),
  status: z.enum(['pending', 'approved', 'applied', 'rolled_back', 'failed']),
  requiresApproval: z.boolean(),
  approvedBy: z.string().optional(),
  appliedAt: z.date().optional(),
  createdAt: z.date(),
});

export type WorkflowAdaptation = z.infer<typeof WorkflowAdaptationSchema>;

// Compliance status
export const ComplianceStatusSchema = z.object({
  tenantId: z.string().uuid(),
  regulationId: z.string().uuid(),
  status: z.enum(['compliant', 'non_compliant', 'partial', 'pending_review', 'exempt']),
  complianceScore: z.number().min(0).max(100),
  lastVerified: z.date(),
  nextReviewDate: z.date(),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    documentUrl: z.string().optional(),
    verifiedAt: z.date(),
  })),
  exceptions: z.array(z.object({
    reason: z.string(),
    approvedBy: z.string(),
    expiresAt: z.date(),
  })),
});

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

// Agent event types
export interface AgentEvent {
  id: string;
  type: 'regulation_detected' | 'analysis_complete' | 'impact_assessed' | 'adaptation_created' | 'compliance_verified';
  payload: unknown;
  timestamp: Date;
  agentId: string;
}

// Predefined regulatory sources
export const REGULATORY_SOURCES: Omit<RegulationSource, 'id' | 'lastChecked'>[] = [
  {
    name: 'Federal Register',
    type: 'rss',
    url: 'https://www.federalregister.gov/api/v1/documents.rss',
    jurisdiction: 'US',
    categories: ['federal', 'executive', 'agency'],
    pollingIntervalMinutes: 60,
    enabled: true,
  },
  {
    name: 'EUR-Lex',
    type: 'api',
    url: 'https://eur-lex.europa.eu/eurlex-ws/rest/search',
    jurisdiction: 'EU',
    categories: ['gdpr', 'digital', 'ai-act', 'dma', 'dsa'],
    pollingIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'SEC EDGAR',
    type: 'rss',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&output=atom',
    jurisdiction: 'US',
    categories: ['securities', 'financial', 'disclosure'],
    pollingIntervalMinutes: 30,
    enabled: true,
  },
  {
    name: 'UK Legislation',
    type: 'api',
    url: 'https://www.legislation.gov.uk/new/data.feed',
    jurisdiction: 'UK',
    categories: ['uk-gdpr', 'fca', 'financial'],
    pollingIntervalMinutes: 120,
    enabled: true,
  },
  {
    name: 'NIST Cybersecurity',
    type: 'rss',
    url: 'https://www.nist.gov/news-events/cybersecurity/rss.xml',
    jurisdiction: 'US',
    categories: ['cybersecurity', 'framework', 'standards'],
    pollingIntervalMinutes: 240,
    enabled: true,
  },
];
