import { differenceInCalendarDays, isAfter } from './time-utils.js';

export type ImpactLevel = 'high' | 'medium' | 'low';
export type LikelihoodLevel = 'high' | 'medium' | 'low';

export interface JurisdictionEntry {
  region: string;
  currentOperations: 'primary' | 'active' | 'pilots' | 'early-stage';
  expansionPlan: 'deepen' | 'scale' | 'expand' | 'evaluate';
  regimes: string[];
  hasLocalCounsel: boolean;
  dataResidency: string;
}

export interface ThreatOpportunity {
  id: string;
  item: string;
  impact: ImpactLevel;
  likelihood: LikelihoodLevel;
  /** months until impact */
  timelineMonths: number;
  owner: string;
  mitigation: string;
}

export interface AgencyContact {
  region: 'us' | 'eu-uk' | 'global';
  agencies: string[];
}

export interface ObligationItem {
  domain: string;
  current: string[];
  upcoming: string[];
  evidence: string[];
}

export interface PolicyPosition {
  stance: 'support' | 'oppose';
  statement: string;
  rationale: string;
}

export interface RegulatoryCalendarItem {
  id: string;
  type: 'comment' | 'hearing' | 'consultation' | 'briefing';
  jurisdiction: string;
  publishedAt: Date;
  deadline: Date;
  owner?: string;
  title: string;
}

export interface DomainOwnership {
  domain: string;
  legal: string;
  product: string;
  security: string;
  comms: string;
}

export interface ExceptionEntry {
  id: string;
  owner: string;
  scope: string;
  deviation: string;
  expiry: Date;
  createdAt: Date;
  compensatingControls: string;
  approvedBy: string[];
}

export interface ProofPoint {
  message: string;
  evidence: string[];
}

export interface OppositionRebuttal {
  claim: string;
  rebuttal: string;
}

export interface NarrativeLogEntry {
  id: string;
  statement: string;
  asked: string[];
  commitments: string[];
  recordedAt: Date;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  owner: string;
  cadenceDays: number;
  lastInteraction?: Date;
  jurisdiction: string;
}

export interface RapidResponseTicket {
  id: string;
  receivedAt: Date;
  acknowledgedAt?: Date;
  pathStartedAt?: Date;
  description: string;
}

export interface ComplianceMetric {
  name: string;
  value: number | string;
  target?: number | string;
  unit?: string;
}

export interface Validator {
  id: string;
  name: string;
  type: 'academic' | 'ngo' | 'customer' | 'standards-expert';
  disclosure: string;
}

export interface CountryRisk {
  country: string;
  rating: 'low' | 'medium' | 'high';
  residencyDecisionTree: string;
  shutdownPlaybook: string;
}

export interface HearingKit {
  narrative: string;
  stats: Record<string, string | number>;
  toughQuestions: string[];
  exhibits: string[];
}

export interface QuarterlyBriefMetrics {
  uptimeSlo: number;
  vulnerabilitySla: string;
  dsarSlaDays: number;
  modelEvalCoverage: number;
  resilienceTestCadence: string;
  roi: {
    procurementCycleReductionDays: number;
    dealsEnabled: number;
    avoidedCostsUsd: number;
  };
}

export interface PolicyBlueprintConfig {
  jurisdictions: JurisdictionEntry[];
  threats: ThreatOpportunity[];
  agencies: AgencyContact[];
  obligations: ObligationItem[];
  positions: PolicyPosition[];
  calendar: RegulatoryCalendarItem[];
  ownership: DomainOwnership[];
  exceptions: ExceptionEntry[];
  messages: string[];
  proofPoints: ProofPoint[];
  opposition: OppositionRebuttal[];
  narrativeLog: NarrativeLogEntry[];
  stakeholders: Stakeholder[];
  hillKit: string[];
  rapidResponses: RapidResponseTicket[];
  complianceMetrics: ComplianceMetric[];
  validators: Validator[];
  countryRisks: CountryRisk[];
  hearingKit: HearingKit;
  governanceMetrics: QuarterlyBriefMetrics;
}

function scoreLevel(level: ImpactLevel | LikelihoodLevel): number {
  switch (level) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}

function timelineWeight(months: number): number {
  if (months <= 3) return 3;
  if (months <= 6) return 2.5;
  if (months <= 12) return 2;
  return 1.5;
}

export class PolicyOperatingBlueprint {
  private readonly config: PolicyBlueprintConfig;

  constructor(config: PolicyBlueprintConfig) {
    this.config = structuredClone(config);
    this.validateCalendarAssignments();
    this.validateExceptions();
  }

  rankThreats() {
    return [...this.config.threats]
      .map((threat) => ({
        ...threat,
        riskScore:
          scoreLevel(threat.impact) *
          scoreLevel(threat.likelihood) *
          timelineWeight(threat.timelineMonths),
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  listCalendarItemsNeedingOwners(referenceDate = new Date()): RegulatoryCalendarItem[] {
    return this.config.calendar.filter((item) => {
      if (item.owner) return false;
      const ageDays = differenceInCalendarDays(referenceDate, item.publishedAt);
      return ageDays >= 1; // 24h SLA
    });
  }

  assignCalendarOwner(id: string, owner: string, assignedAt = new Date()): void {
    const item = this.config.calendar.find((entry) => entry.id === id);
    if (!item) {
      throw new Error(`Calendar item ${id} not found`);
    }
    const ageDays = differenceInCalendarDays(assignedAt, item.publishedAt);
    if (ageDays > 1) {
      throw new Error(`Owner assignment for ${id} missed 24h SLA`);
    }
    item.owner = owner;
  }

  registerException(exception: ExceptionEntry): void {
    const daysUntilExpiry = differenceInCalendarDays(
      exception.expiry,
      exception.createdAt,
    );
    if (daysUntilExpiry > 90) {
      throw new Error('Exception expiry exceeds 90-day maximum');
    }
    if (exception.approvedBy.length < 2) {
      throw new Error('Exception requires dual approval (GC + CISO)');
    }
    this.config.exceptions.push(structuredClone(exception));
  }

  getOpenExceptions(referenceDate = new Date()): ExceptionEntry[] {
    return this.config.exceptions.filter((entry) =>
      isAfter(entry.expiry, referenceDate),
    );
  }

  getOpenExceptionMetric(referenceDate = new Date()): Record<string, number> {
    const open = this.getOpenExceptions(referenceDate);
    return open.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.scope] = (acc[entry.scope] ?? 0) + 1;
      return acc;
    }, {});
  }

  logNarrative(entry: NarrativeLogEntry): void {
    this.config.narrativeLog.push(structuredClone(entry));
  }

  logStakeholderInteraction(id: string, at = new Date()): void {
    const stakeholder = this.config.stakeholders.find((item) => item.id === id);
    if (!stakeholder) {
      throw new Error(`Unknown stakeholder ${id}`);
    }
    stakeholder.lastInteraction = at;
  }

  getStaleStakeholders(referenceDate = new Date()): Stakeholder[] {
    return this.config.stakeholders.filter((stakeholder) => {
      if (!stakeholder.lastInteraction) return true;
      const daysSince = differenceInCalendarDays(
        referenceDate,
        stakeholder.lastInteraction,
      );
      return daysSince > stakeholder.cadenceDays;
    });
  }

  recordRapidResponse(ticket: RapidResponseTicket): void {
    const ack = ticket.acknowledgedAt ?? new Date();
    const path = ticket.pathStartedAt ?? new Date();
    const ackAge = differenceInCalendarDays(ack, ticket.receivedAt);
    const pathAge = differenceInCalendarDays(path, ticket.receivedAt);
    if (ackAge > 1) {
      throw new Error('Rapid response acknowledgment missed 24h SLA');
    }
    if (pathAge > 3) {
      throw new Error('Rapid response substantive path missed 72h SLA');
    }
    this.config.rapidResponses.push(structuredClone({ ...ticket, acknowledgedAt: ack, pathStartedAt: path }));
  }

  generateQuarterlyBrief(metrics: QuarterlyBriefMetrics) {
    return {
      headlineRisks: this.rankThreats().slice(0, 3).map((t) => t.item),
      jurisdictionScoreboard: this.config.jurisdictions.map((j) => ({
        region: j.region,
        dataResidency: j.dataResidency,
        regimes: j.regimes,
      })),
      engagementOutcomes: this.config.calendar.map((item) => ({
        id: item.id,
        type: item.type,
        owner: item.owner,
        deadline: item.deadline.toISOString(),
      })),
      exceptions: this.getOpenExceptions(),
      roi: metrics.roi,
      metrics,
    };
  }

  listComplianceTelemetry(): ComplianceMetric[] {
    return [...this.config.complianceMetrics];
  }

  getValidators(): Validator[] {
    return [...this.config.validators];
  }

  getHearingReadiness(): HearingKit {
    return structuredClone(this.config.hearingKit);
  }

  private validateCalendarAssignments(): void {
    const lateItems = this.listCalendarItemsNeedingOwners();
    if (lateItems.length > 0) {
      // We allow validation to pass but signal that deadlines exist
      console.warn(
        `Policy blueprint has ${lateItems.length} calendar items without owners past the 24h SLA`,
      );
    }
  }

  private validateExceptions(): void {
    this.config.exceptions.forEach((exception) => {
      const daysUntilExpiry = differenceInCalendarDays(
        exception.expiry,
        exception.createdAt,
      );
      if (daysUntilExpiry > 90) {
        throw new Error(`Exception ${exception.id} expiry exceeds 90 days`);
      }
      if (exception.approvedBy.length < 2) {
        throw new Error(`Exception ${exception.id} missing required approvals`);
      }
    });
  }
}

export function createDefaultPolicyBlueprint(): PolicyBlueprintConfig {
  const now = new Date('2025-01-01T00:00:00Z');
  return {
    jurisdictions: [
      {
        region: 'U.S. federal + CA/NY',
        currentOperations: 'primary',
        expansionPlan: 'deepen',
        regimes: ['FTC/CFPB/SEC', 'CCPA/CPRA', 'AI EO'],
        hasLocalCounsel: true,
        dataResidency: 'U.S.-first, FedRAMP-ready path',
      },
      {
        region: 'EU',
        currentOperations: 'active',
        expansionPlan: 'scale',
        regimes: ['GDPR', 'AI Act', 'NIS2', 'DORA'],
        hasLocalCounsel: true,
        dataResidency: 'EU region + SCC/DTIA',
      },
      {
        region: 'UK',
        currentOperations: 'active',
        expansionPlan: 'scale',
        regimes: ['UK DPA', 'Online Safety', 'AI White Paper'],
        hasLocalCounsel: true,
        dataResidency: 'UK region; ICO consultation playbook',
      },
      {
        region: 'Canada',
        currentOperations: 'pilots',
        expansionPlan: 'expand',
        regimes: ['CPPA', 'PIPEDA'],
        hasLocalCounsel: false,
        dataResidency: 'CA region optional; SCCs + TIAs',
      },
      {
        region: 'APAC (SG, AU, JP)',
        currentOperations: 'active',
        expansionPlan: 'expand',
        regimes: ['PDPA', 'SOCI', 'APPI', 'ISMAP'],
        hasLocalCounsel: false,
        dataResidency: 'Regional residency by RFP',
      },
      {
        region: 'India/Brazil',
        currentOperations: 'early-stage',
        expansionPlan: 'evaluate',
        regimes: ['DPDP', 'LGPD'],
        hasLocalCounsel: false,
        dataResidency: 'Residency optional; prepare DPA modeling',
      },
    ],
    threats: [
      {
        id: 'threat-ai-act',
        item: 'EU AI Act conformity for high-risk use cases',
        impact: 'high',
        likelihood: 'high',
        timelineMonths: 12,
        owner: 'Legal (AI) & Product',
        mitigation: 'Map use cases, Article 9/10 controls, tech docs, NB readiness',
      },
      {
        id: 'threat-gdpr-llm',
        item: 'GDPR enforcement on LLM data minimization',
        impact: 'high',
        likelihood: 'medium',
        timelineMonths: 6,
        owner: 'Privacy Eng',
        mitigation: 'DPIAs, retention minimization, synthetic data',
      },
      {
        id: 'threat-us-patchwork',
        item: 'U.S. state privacy patchwork (sensitive data)',
        impact: 'medium',
        likelihood: 'high',
        timelineMonths: 3,
        owner: 'Privacy Ops',
        mitigation: 'Uniform DSAR/consent flows, state notices',
      },
      {
        id: 'threat-sec-cyber',
        item: 'SEC cyber disclosures (public customers)',
        impact: 'medium',
        likelihood: 'medium',
        timelineMonths: 3,
        owner: 'Security',
        mitigation: 'Incident playbook ≤4 days, board materiality rubric',
      },
      {
        id: 'threat-export-controls',
        item: 'Export controls on frontier models',
        impact: 'high',
        likelihood: 'medium',
        timelineMonths: 12,
        owner: 'Legal (Trade)',
        mitigation: 'Dual-use screening, customer end-use certifications',
      },
      {
        id: 'threat-nis2-dora',
        item: 'NIS2/DORA operational resilience',
        impact: 'medium',
        likelihood: 'medium',
        timelineMonths: 12,
        owner: 'SRE/SecOps',
        mitigation: 'Map to resilience controls, attestations in trust center',
      },
      {
        id: 'threat-safety-narrative',
        item: 'AI safety narrative gap vs. competitors',
        impact: 'high',
        likelihood: 'medium',
        timelineMonths: 3,
        owner: 'Comms/Policy',
        mitigation: 'Publish safety case, benchmarks, regulator briefings',
      },
    ],
    agencies: [
      {
        region: 'us',
        agencies: [
          'FTC',
          'CFPB',
          'SEC',
          'NTIA',
          'NIST',
          'DOJ',
          'DHS/CISA/TSA',
          'Commerce/BIS',
          'FCC',
          'HHS/OCR',
          'Congressional committees',
          'State AGs',
        ],
      },
      {
        region: 'eu-uk',
        agencies: [
          'European Commission/EDPB',
          'National DPAs',
          'AI Office/Notified Bodies',
          'ENISA',
          'EBA/EIOPA/ESMA',
          'ICO',
          'CMA',
        ],
      },
      {
        region: 'global',
        agencies: [
          'Singapore PDPC',
          'Australia OAIC/ACSC',
          'India DPB',
          'Brazil ANPD',
          'Canada OPC',
          'OECD',
          'G7',
          'ISO',
          'IEEE',
        ],
      },
    ],
    obligations: [
      {
        domain: 'Privacy',
        current: ['DPIA/DSAR', 'SCC/DTIA', 'Consent for sensitive data'],
        upcoming: ['EU GenAI guidance', 'CA CPPA rulemaking', 'ANPD AI guidance'],
        evidence: ['DPIAs', 'RoPA', 'Consent logs', 'Retention schedules'],
      },
      {
        domain: 'AI',
        current: ['Model cards', 'Data lineage', 'Human oversight'],
        upcoming: ['EU AI Act standards', 'UK pro-innovation consultations', 'US safety test reporting'],
        evidence: ['Model evaluations', 'Red-team results', 'Policy-aligned guardrails'],
      },
      {
        domain: 'Security',
        current: ['ISO 27001/SOC 2 controls', 'Incident response'],
        upcoming: ['NIS2 transposition', 'SEC cyber enforcement', 'DORA RTS/ITS'],
        evidence: ['Runbooks', 'Drill evidence', 'Vuln mgmt SLAs', 'Audit trails'],
      },
      {
        domain: 'Resilience/Financial',
        current: ['Uptime/SLO dashboards', 'BCDR'],
        upcoming: ['DORA scenario testing', 'Sector tabletop requests'],
        evidence: ['RTO/RPO tests', 'Dependency maps', 'Vendor risk results'],
      },
      {
        domain: 'Trade',
        current: ['OFAC/EAR screenings'],
        upcoming: ['Frontier model thresholds', 'Updated entity lists'],
        evidence: ['Screening logs', 'Export classifications', 'Customer attestations'],
      },
    ],
    positions: [
      {
        stance: 'support',
        statement: 'Risk-based AI governance and harmonized privacy',
        rationale: 'Enables regulated adoption with safety evidence',
      },
      {
        stance: 'support',
        statement: 'Outcome-based security/resilience standards',
        rationale: 'Focus on measurable reliability and resilience',
      },
      {
        stance: 'support',
        statement: 'Transparency with IP/abuse protections and interoperable portability',
        rationale: 'Balances trust with protection of proprietary models',
      },
      {
        stance: 'support',
        statement: 'Voluntary-but-auditable safety benchmarking',
        rationale: 'Creates accountable transparency without rigid mandates',
      },
      {
        stance: 'oppose',
        statement: 'Blanket data localization and strict downstream liability',
        rationale: 'Harmful to resilience and innovation; disproportionate risk transfer',
      },
      {
        stance: 'oppose',
        statement: 'Mandatory proprietary source disclosure and prescriptive algorithm mandates',
        rationale: 'Risk to IP and agility without calibrated risk models',
      },
    ],
    calendar: [
      {
        id: 'calendar-ftc-ai',
        type: 'comment',
        jurisdiction: 'US',
        publishedAt: now,
        deadline: new Date('2025-02-15T00:00:00Z'),
        title: 'FTC AI fairness consultation',
      },
      {
        id: 'calendar-uk-ico',
        type: 'briefing',
        jurisdiction: 'UK',
        publishedAt: now,
        deadline: new Date('2025-01-20T00:00:00Z'),
        owner: 'Policy Comms',
        title: 'ICO quarterly safety briefing',
      },
    ],
    ownership: [
      {
        domain: 'Privacy/data',
        legal: 'GC (Privacy)',
        product: 'Data PM',
        security: 'Privacy Eng',
        comms: 'Policy Comms',
      },
      {
        domain: 'AI governance',
        legal: 'GC (AI)',
        product: 'AI/ML Lead',
        security: 'Secure AI Red Team',
        comms: 'Policy Comms',
      },
      {
        domain: 'Cyber/resilience',
        legal: 'GC (Cyber)',
        product: 'SRE Lead',
        security: 'CISO',
        comms: 'GR lead',
      },
      {
        domain: 'Trade/sanctions',
        legal: 'Trade Counsel',
        product: 'Product Ops',
        security: 'Security Ops',
        comms: 'GR lead',
      },
      {
        domain: 'Competition',
        legal: 'Antitrust Counsel',
        product: 'Product Strategy',
        security: 'Security',
        comms: 'Comms',
      },
    ],
    exceptions: [
      {
        id: 'exception-1',
        owner: 'GC',
        scope: 'Privacy/data',
        deviation: 'Extended retention for regulated audit trail',
        expiry: new Date('2025-02-15T00:00:00Z'),
        createdAt: now,
        compensatingControls: 'Hashing + access logging',
        approvedBy: ['GC', 'CISO'],
      },
    ],
    messages: [
      'Innovation with guardrails',
      'Safety and reliability proven by metrics',
      'Jobs and competitiveness through faster shipping',
      'Consumer/mission benefit via reduced risk and faster insight',
    ],
    proofPoints: [
      {
        message: 'Reliability and safety',
        evidence: ['Uptime/SLO history', 'Incident MTTR', 'Red-team + bias evals'],
      },
      {
        message: 'Customer outcomes',
        evidence: ['Case studies (permissioned)', 'Third-party attestations'],
      },
    ],
    opposition: [
      {
        claim: 'Privacy risk and over-collection',
        rebuttal: 'Data minimization, DPIAs, and consent logging prove bounded collection',
      },
      {
        claim: 'Bias and unfairness',
        rebuttal: 'Published bias evaluations and guardrails with human oversight',
      },
    ],
    narrativeLog: [
      {
        id: 'narrative-1',
        statement: 'Shared AI safety benchmarks with regulators',
        asked: ['How is downstream misuse prevented?'],
        commitments: ['Provide follow-up on monitoring'],
        recordedAt: now,
      },
    ],
    stakeholders: [
      {
        id: 'stakeholder-ftc',
        name: 'FTC AI Taskforce',
        role: 'Regulator',
        owner: 'Policy Comms',
        cadenceDays: 90,
        jurisdiction: 'US',
      },
      {
        id: 'stakeholder-ico',
        name: 'UK ICO AI Lead',
        role: 'Regulator',
        owner: 'Policy Comms',
        cadenceDays: 90,
        jurisdiction: 'UK',
      },
    ],
    hillKit: [
      'One-pager',
      'Product demo script',
      'Trust packet (controls, uptime, audits)',
      'Jurisdiction-aligned case studies',
    ],
    rapidResponses: [],
    complianceMetrics: [
      { name: 'Exceptions open', value: 1 },
      { name: 'MTTR hours', value: 4 },
      { name: 'DSAR SLA days', value: 7 },
      { name: 'Model eval coverage %', value: 90 },
      { name: 'Resilience test cadence', value: 'Quarterly' },
    ],
    validators: [
      {
        id: 'validator-academic',
        name: 'AI Safety Researcher Consortium',
        type: 'academic',
        disclosure: 'Advisory council member with published charter',
      },
      {
        id: 'validator-customer',
        name: 'Regulated Customer Advocate',
        type: 'customer',
        disclosure: 'Opt-in testimonial for AI safety impacts',
      },
    ],
    countryRisks: [
      {
        country: 'High-risk market',
        rating: 'high',
        residencyDecisionTree: 'Data localization avoided unless mandated; dual-hosting fallback',
        shutdownPlaybook: 'Immediate customer comms and controlled exit',
      },
      {
        country: 'Emerging APAC market',
        rating: 'medium',
        residencyDecisionTree: 'Regional hosting optional based on RFP',
        shutdownPlaybook: 'Graceful degradation and local counsel notification',
      },
    ],
    hearingKit: {
      narrative: 'Guardrails-first innovation with measurable safety and resilience',
      stats: {
        uptime: '99.95% last 12 months',
        mttrHours: 4,
        dsarSlaDays: 7,
      },
      toughQuestions: [
        'How do you prevent downstream misuse?',
        'What are your model eval guardrails?',
        'How do you manage export controls?',
      ],
      exhibits: ['Safety benchmarks', 'Incident response drills', 'Audit attestations'],
    },
    governanceMetrics: {
      uptimeSlo: 99.95,
      vulnerabilitySla: '<=14 days high severity',
      dsarSlaDays: 7,
      modelEvalCoverage: 0.9,
      resilienceTestCadence: 'Quarterly',
      roi: {
        procurementCycleReductionDays: 15,
        dealsEnabled: 12,
        avoidedCostsUsd: 250000,
      },
    },
  };
}
