import { v4 as uuidv4 } from 'uuid';

export type PurposeTag = 'public-health' | 'research' | 'training';

export interface OperatingPrinciples {
  purposeLimitation: PurposeTag[];
  retentionDaysDefault: number;
  retentionDaysPhi: number;
  residencyRequired: boolean;
  securityControls: {
    oidc: boolean;
    mtls: boolean;
    fieldLevelEncryption: boolean;
    provenanceLedger: boolean;
    authorityBinding: boolean;
  };
}

export interface SloTargets {
  apiReadP95Ms: number;
  apiWriteP95Ms: number;
  subscriptionsP95Ms: number;
  ingestEventsPerSecondPerPod: number;
  ingestPreStorageP95Ms: number;
  graphOneHopP95Ms: number;
  graphTwoToThreeHopP95Ms: number;
}

export interface CostGuardrails {
  ingestCostPerThousand: number;
  graphqlCostPerMillion: number;
  alertingThresholdPercentage: number;
}

export interface EpicTask {
  id: string;
  description: string;
  output: string;
}

export interface EpicDefinition {
  id: string;
  name: string;
  tasks: EpicTask[];
  observabilityHooks: string[];
  backoutArtifact: string;
}

export interface ArtifactStatus {
  artifact: string;
  ready: boolean;
  hash: string;
  verifiedBy: string;
  verifiedAt: string;
  provenance: string;
  evidence?: string;
}

export interface TaskEvidence {
  taskId: string;
  artifact: string;
  ready: boolean;
  hash: string;
  verifiedBy: string;
  verifiedAt: string;
  provenance: string;
  evidence?: string;
}

export interface EpicProgress {
  epicId: string;
  completedTasks: Set<string>;
  taskEvidence: TaskEvidence[];
  evidence: ArtifactStatus[];
}

export interface PerformanceSnapshot {
  apiReadP95Ms: number;
  apiWriteP95Ms: number;
  subscriptionsP95Ms: number;
  ingestEventsPerSecondPerPod: number;
  ingestPreStorageP95Ms: number;
  graphOneHopP95Ms: number;
  graphTwoToThreeHopP95Ms: number;
}

export interface CostSnapshot {
  ingestCostPerThousand: number;
  graphqlCostPerMillion: number;
}

export interface ComplianceInput {
  purposeTags: PurposeTag[];
  residencyEnabled: boolean;
  retentionDaysDefault: number;
  retentionDaysPhi: number;
  securityControls: OperatingPrinciples['securityControls'];
  performance: PerformanceSnapshot;
  costs: CostSnapshot;
  epicProgress: EpicProgress[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
  snapshotId: string;
  epicCoverage: EpicCoverage[];
}

export interface EpicCoverage {
  epicId: string;
  completed: number;
  total: number;
  percentComplete: number;
  missingTasks: string[];
}

const PUBLIC_HEALTH_EPICS: EpicDefinition[] = [
  {
    id: 'EP1',
    name: 'Governance & Legal',
    tasks: [
      {
        id: 'EP1-T01',
        description: 'System boundary and PHI flows with ISSO sign-off',
        output: 'boundary.md',
      },
      {
        id: 'EP1-T02',
        description: 'Legal bases catalog and reportable disease triggers',
        output: 'legal.md',
      },
      {
        id: 'EP1-T03',
        description: 'Inter-agency MOUs/DUAs templates',
        output: 'mou-dua/',
      },
      {
        id: 'EP1-T04',
        description: 'Purpose and residency labels enforced',
        output: 'labels.yaml',
      },
      {
        id: 'EP1-T05',
        description: 'Authority/warrant binding with auditability',
        output: 'binding.yml',
      },
      {
        id: 'EP1-T06',
        description: 'HIPAA public health exception guidance',
        output: 'hipaa-ph.md',
      },
      {
        id: 'EP1-T07',
        description: 'Case definition registry (CSTE/WHO)',
        output: 'cases/defs.json',
      },
      {
        id: 'EP1-T08',
        description: 'DPIA and equity review',
        output: 'dpia.md',
      },
      {
        id: 'EP1-T09',
        description: 'Transparency and notices',
        output: 'notices/',
      },
      {
        id: 'EP1-T10',
        description: 'Records and retention map',
        output: 'retention.map',
      },
      {
        id: 'EP1-T11',
        description: 'SCRM and SBOM',
        output: 'scrm.md',
      },
      {
        id: 'EP1-T12',
        description: 'Incident/breach SOP',
        output: 'ir-ph.md',
      },
      {
        id: 'EP1-T13',
        description: 'Evidence binder for policy',
        output: 'binder.zip',
      },
      {
        id: 'EP1-T14',
        description: 'Backout and containment',
        output: 'backout.md',
      },
    ],
    observabilityHooks: ['equity review cadence', 'legal approval checkpoints'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP2',
    name: 'Ingest & Interop',
    tasks: [
      {
        id: 'EP2-T01',
        description: 'Source registry for all feeds',
        output: 'sources.csv',
      },
      {
        id: 'EP2-T02',
        description: 'HL7 v2 ELR adapters',
        output: 'elr/',
      },
      {
        id: 'EP2-T03',
        description: 'FHIR/CDA eCR bridge',
        output: 'ecr/',
      },
      {
        id: 'EP2-T04',
        description: 'Syndromic surveillance feeds',
        output: 'syndromic/',
      },
      {
        id: 'EP2-T05',
        description: 'Wastewater & environmental signals',
        output: 'env adapters',
      },
      {
        id: 'EP2-T06',
        description: 'Mobility/contact feeds with privacy-aware aggregates',
        output: 'mobility/',
      },
      {
        id: 'EP2-T07',
        description: 'Dedup and deterministic linking',
        output: 'dedup lib',
      },
      {
        id: 'EP2-T08',
        description: 'Provenance attachment',
        output: 'prov lib',
      },
      {
        id: 'EP2-T09',
        description: 'DLQ and replay',
        output: 'dlq.cfg',
      },
      {
        id: 'EP2-T10',
        description: 'Residency and jurisdiction gates',
        output: 'gatekeeper',
      },
      {
        id: 'EP2-T11',
        description: 'Observability for ingest',
        output: 'dashboards',
      },
      {
        id: 'EP2-T12',
        description: 'Golden fixtures',
        output: 'golden/',
      },
      {
        id: 'EP2-T13',
        description: 'Cost model',
        output: 'finops.csv',
      },
      {
        id: 'EP2-T14',
        description: 'Backout per feed',
        output: 'backout.md',
      },
    ],
    observabilityHooks: ['ingest throughput', 'lag/freshness'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP3',
    name: 'Canonical Model & Graph',
    tasks: [
      {
        id: 'EP3-T01',
        description: 'Entities and edges schema',
        output: 'entities.csv',
      },
      {
        id: 'EP3-T02',
        description: 'Case/event line list schema',
        output: 'linelist.yaml',
      },
      {
        id: 'EP3-T03',
        description: 'Terminology mappings',
        output: 'term map',
      },
      {
        id: 'EP3-T04',
        description: 'Constraints and indexes',
        output: 'constraints.*',
      },
      {
        id: 'EP3-T05',
        description: 'Consent and purpose labels',
        output: 'labels.yaml',
      },
      {
        id: 'EP3-T06',
        description: 'Provenance and claims',
        output: 'prov.yml',
      },
      {
        id: 'EP3-T07',
        description: 'Schema diff linter',
        output: 'lint tool',
      },
      {
        id: 'EP3-T08',
        description: 'Golden graph fixture',
        output: 'golden.cypher',
      },
      {
        id: 'EP3-T09',
        description: 'Data quality rules',
        output: 'dq rules',
      },
      {
        id: 'EP3-T10',
        description: 'Docs and runnable examples',
        output: 'docs/model',
      },
      {
        id: 'EP3-T11',
        description: 'Backout plan',
        output: 'rollback.md',
      },
    ],
    observabilityHooks: ['schema linting', 'golden graph validations'],
    backoutArtifact: 'rollback.md',
  },
  {
    id: 'EP4',
    name: 'Entity Resolution & Linking',
    tasks: [
      {
        id: 'EP4-T01',
        description: 'PHI-safe ER strategy',
        output: 'er.yml',
      },
      {
        id: 'EP4-T02',
        description: 'Blocking and candidate generation',
        output: 'block lib',
      },
      {
        id: 'EP4-T03',
        description: 'Similarity functions',
        output: 'sim lib',
      },
      {
        id: 'EP4-T04',
        description: 'Contact and household graph',
        output: 'links.cql',
      },
      {
        id: 'EP4-T05',
        description: 'Exposure event modeling',
        output: 'exposure.yaml',
      },
      {
        id: 'EP4-T06',
        description: 'Human-in-the-loop adjudication UI',
        output: 'HIL UI',
      },
      {
        id: 'EP4-T07',
        description: 'Unmerge and audit tooling',
        output: 'unmerge tool',
      },
      {
        id: 'EP4-T08',
        description: 'Drift and decay monitors',
        output: 'monitors',
      },
      {
        id: 'EP4-T09',
        description: 'Purpose gates for non-PH users',
        output: 'rego',
      },
      {
        id: 'EP4-T10',
        description: 'Backout for risky ER',
        output: 'backout.md',
      },
    ],
    observabilityHooks: ['link accuracy', 'drift alerts'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP5',
    name: 'Analytics & Forecasts',
    tasks: [
      {
        id: 'EP5-T01',
        description: 'Signal catalog',
        output: 'signals.yaml',
      },
      {
        id: 'EP5-T02',
        description: 'Epi curves and growth rates',
        output: 'epi-curves/',
      },
      {
        id: 'EP5-T03',
        description: 'Time-delay and nowcasting',
        output: 'nowcast/',
      },
      {
        id: 'EP5-T04',
        description: 'Rt estimation',
        output: 'rt/',
      },
      {
        id: 'EP5-T05',
        description: 'SEIR-like baseline models',
        output: 'seir/',
      },
      {
        id: 'EP5-T06',
        description: 'Spatial models and kriging',
        output: 'spatial/',
      },
      {
        id: 'EP5-T07',
        description: 'Scenario planning',
        output: 'scenarios/',
      },
      {
        id: 'EP5-T08',
        description: 'Uncertainty and intervals',
        output: 'intervals.md',
      },
      {
        id: 'EP5-T09',
        description: 'Bias and robustness checks',
        output: 'bias.md',
      },
      {
        id: 'EP5-T10',
        description: 'Explainability surfaces',
        output: 'xai UI',
      },
      {
        id: 'EP5-T11',
        description: 'Cost-quality curves',
        output: 'cq.md',
      },
      {
        id: 'EP5-T12',
        description: 'Observability for models',
        output: 'dashboards',
      },
      {
        id: 'EP5-T13',
        description: 'Backout pinned baselines',
        output: 'backout.md',
      },
    ],
    observabilityHooks: ['forecast latency', 'model health'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP6',
    name: 'Detection & Early Warning',
    tasks: [
      {
        id: 'EP6-T01',
        description: 'Outbreak signal rules',
        output: 'rules.yaml',
      },
      {
        id: 'EP6-T02',
        description: 'Anomaly detection',
        output: 'anomaly/',
      },
      {
        id: 'EP6-T03',
        description: 'Cluster detection (graph)',
        output: 'gds pipeline',
      },
      {
        id: 'EP6-T04',
        description: 'Genomic/epi linkage hooks',
        output: 'genomic hooks',
      },
      {
        id: 'EP6-T05',
        description: 'Alert scoring and fusion',
        output: 'fuse.md',
      },
      {
        id: 'EP6-T06',
        description: 'False positive controls',
        output: 'fp.md',
      },
      {
        id: 'EP6-T07',
        description: 'Human review queue',
        output: 'triage UI',
      },
      {
        id: 'EP6-T08',
        description: 'Partner and WHO/IHR notifications',
        output: 'ihr.md',
      },
      {
        id: 'EP6-T09',
        description: 'Observability for alerts',
        output: 'dashboards',
      },
      {
        id: 'EP6-T10',
        description: 'Backout throttles',
        output: 'backout.md',
      },
      {
        id: 'EP6-T11',
        description: 'Evidence packs',
        output: 'pack.zip',
      },
    ],
    observabilityHooks: ['alert volumes', 'time-to-detect'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP7',
    name: 'Interventions & Case Management',
    tasks: [
      {
        id: 'EP7-T01',
        description: 'Intervention taxonomy',
        output: 'interventions.yaml',
      },
      {
        id: 'EP7-T02',
        description: 'Case management UI',
        output: 'case UI',
      },
      {
        id: 'EP7-T03',
        description: 'Contact tracing workbench',
        output: 'tracing UI',
      },
      {
        id: 'EP7-T04',
        description: 'Vaccination and prophylaxis tracking',
        output: 'vax schema',
      },
      {
        id: 'EP7-T05',
        description: 'Referral and social services links',
        output: 'referral svc',
      },
      {
        id: 'EP7-T06',
        description: 'Outcome tracking',
        output: 'outcome.yaml',
      },
      {
        id: 'EP7-T07',
        description: 'Equity and access flags',
        output: 'equity.md',
      },
      {
        id: 'EP7-T08',
        description: 'Intervention evidence binder',
        output: 'binder.zip',
      },
      {
        id: 'EP7-T09',
        description: 'DR/failover',
        output: 'dr.md',
      },
      {
        id: 'EP7-T10',
        description: 'Observability on notifications',
        output: 'dashboards',
      },
      {
        id: 'EP7-T11',
        description: 'Backout for contact operations',
        output: 'backout.md',
      },
    ],
    observabilityHooks: ['time-to-notify', 'time-to-isolate'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP8',
    name: 'Public Dashboards & Communications',
    tasks: [
      {
        id: 'EP8-T01',
        description: 'KPI framework',
        output: 'kpis.md',
      },
      {
        id: 'EP8-T02',
        description: 'Public dashboard with accessibility and localization',
        output: 'dashboard',
      },
      {
        id: 'EP8-T03',
        description: 'Open data exports with DP bounds',
        output: 'exports/',
      },
      {
        id: 'EP8-T04',
        description: 'Media briefing kit',
        output: 'media kit',
      },
      {
        id: 'EP8-T05',
        description: 'Accessibility and localization',
        output: 'a11y/i18n',
      },
      {
        id: 'EP8-T06',
        description: 'Rate-limited public/research API with purpose gates',
        output: 'public API',
      },
      {
        id: 'EP8-T07',
        description: 'Versioned snapshots',
        output: 'snapshots/',
      },
      {
        id: 'EP8-T08',
        description: 'Mis/disinformation playbooks',
        output: 'misinfo.md',
      },
      {
        id: 'EP8-T09',
        description: 'Observability for public surfaces',
        output: 'dashboards',
      },
      {
        id: 'EP8-T10',
        description: 'Backout freeze for public data',
        output: 'backout.md',
      },
      {
        id: 'EP8-T11',
        description: 'Evidence packs for public comms',
        output: 'pack.zip',
      },
    ],
    observabilityHooks: ['freshness', 'uptime'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP9',
    name: 'Privacy Engineering & De-Identification',
    tasks: [
      {
        id: 'EP9-T01',
        description: 'De-ID policy with Safe Harbor and expert determination',
        output: 'deid.md',
      },
      {
        id: 'EP9-T02',
        description: 'Quasi-identifier catalog',
        output: 'qi.csv',
      },
      {
        id: 'EP9-T03',
        description: 'k-anonymity/l-diversity/t-closeness algorithms',
        output: 'deid lib',
      },
      {
        id: 'EP9-T04',
        description: 'Geo/date generalization',
        output: 'generalize.yaml',
      },
      {
        id: 'EP9-T05',
        description: 'Differential privacy layer',
        output: 'dp layer',
      },
      {
        id: 'EP9-T06',
        description: 'Tokenization/PE/FFX',
        output: 'token svc',
      },
      {
        id: 'EP9-T07',
        description: 'Consent/opt-out service',
        output: 'consent svc',
      },
      {
        id: 'EP9-T08',
        description: 'Data minimization',
        output: 'minimize.md',
      },
      {
        id: 'EP9-T09',
        description: 'Audit and access reviews',
        output: 'reviews/',
      },
      {
        id: 'EP9-T10',
        description: 'Backout for shared datasets',
        output: 'backout.md',
      },
      {
        id: 'EP9-T11',
        description: 'Evidence binder',
        output: 'binder.zip',
      },
    ],
    observabilityHooks: ['de-identification risk thresholds'],
    backoutArtifact: 'backout.md',
  },
  {
    id: 'EP10',
    name: 'Observability, SLOs, FinOps & Equity Metrics',
    tasks: [
      {
        id: 'EP10-T01',
        description: 'OTel with tenant/region labels',
        output: 'spans/metrics',
      },
      {
        id: 'EP10-T02',
        description: 'SLO dashboards and error budgets',
        output: 'dashboards',
      },
      {
        id: 'EP10-T03',
        description: 'Equity metrics',
        output: 'equity.json',
      },
      {
        id: 'EP10-T04',
        description: 'Synthetic probes',
        output: 'probes',
      },
      {
        id: 'EP10-T05',
        description: 'FinOps boards',
        output: 'finops.json',
      },
      {
        id: 'EP10-T06',
        description: 'Alert hygiene',
        output: 'hygiene.md',
      },
      {
        id: 'EP10-T07',
        description: 'Evidence packs',
        output: 'bundle.zip',
      },
      {
        id: 'EP10-T08',
        description: 'PIR template',
        output: 'pir.md',
      },
      {
        id: 'EP10-T09',
        description: 'Customer/PHA SLA boards',
        output: 'boards',
      },
      {
        id: 'EP10-T10',
        description: 'Backout/freeze telemetry',
        output: 'freeze.md',
      },
    ],
    observabilityHooks: ['p95/99 latency', 'error budgets'],
    backoutArtifact: 'freeze.md',
  },
  {
    id: 'EP11',
    name: 'Release, Field Ops & Continuous Evidence',
    tasks: [
      {
        id: 'EP11-T01',
        description: 'Release cadence',
        output: 'cadence.md',
      },
      {
        id: 'EP11-T02',
        description: 'Post-deploy validation gate',
        output: 'pdv job',
      },
      {
        id: 'EP11-T03',
        description: 'Compliance pack',
        output: 'pack.zip',
      },
      {
        id: 'EP11-T04',
        description: 'Field ops runbooks',
        output: 'runbooks/',
      },
      {
        id: 'EP11-T05',
        description: 'Training and playbooks',
        output: 'training/',
      },
      {
        id: 'EP11-T06',
        description: 'Migration guides',
        output: 'migrate.md',
      },
      {
        id: 'EP11-T07',
        description: 'KPI roll-up',
        output: 'kpi.pdf',
      },
      {
        id: 'EP11-T08',
        description: 'Changelog automation',
        output: 'action',
      },
      {
        id: 'EP11-T09',
        description: 'E2E acceptance packs',
        output: 'packs/',
      },
      {
        id: 'EP11-T10',
        description: 'EOL/de-feature communications',
        output: 'eol.md',
      },
      {
        id: 'EP11-T11',
        description: 'Release freeze backout',
        output: 'freeze.md',
      },
    ],
    observabilityHooks: ['post-deploy validation', 'release health'],
    backoutArtifact: 'freeze.md',
  },
];

const OPERATING_PRINCIPLES: OperatingPrinciples = {
  purposeLimitation: ['public-health'],
  retentionDaysDefault: 365,
  retentionDaysPhi: 30,
  residencyRequired: true,
  securityControls: {
    oidc: true,
    mtls: true,
    fieldLevelEncryption: true,
    provenanceLedger: true,
    authorityBinding: true,
  },
};

const SLO_TARGETS: SloTargets = {
  apiReadP95Ms: 350,
  apiWriteP95Ms: 700,
  subscriptionsP95Ms: 250,
  ingestEventsPerSecondPerPod: 1000,
  ingestPreStorageP95Ms: 100,
  graphOneHopP95Ms: 300,
  graphTwoToThreeHopP95Ms: 1200,
};

const COST_GUARDRAILS: CostGuardrails = {
  ingestCostPerThousand: 0.1,
  graphqlCostPerMillion: 2,
  alertingThresholdPercentage: 80,
};

const ensureValue = (value: number, message: string, issues: ValidationIssue[], code: string): void => {
  if (Number.isNaN(value) || value === undefined || value === null) {
    issues.push({ code, message });
  }
};

export class PublicHealthPlan {
  readonly epics: EpicDefinition[] = PUBLIC_HEALTH_EPICS;
  readonly operatingPrinciples: OperatingPrinciples = OPERATING_PRINCIPLES;
  readonly sloTargets: SloTargets = SLO_TARGETS;
  readonly costGuardrails: CostGuardrails = COST_GUARDRAILS;

  validate(input: ComplianceInput): ValidationReport {
    const issues: ValidationIssue[] = [];
    const snapshotId = uuidv4();

    const epicCoverage = this.validateEpics(input, issues);

    this.validatePurpose(input, issues);
    this.validateResidency(input, issues);
    this.validateRetention(input, issues);
    this.validateSecurityControls(input, issues);
    this.validatePerformance(input, issues);
    this.validateCosts(input, issues);

    return { ok: issues.length === 0, issues, snapshotId, epicCoverage };
  }

  private assertEvidenceCompleteness(
    context: string,
    evidence: Pick<ArtifactStatus, 'artifact' | 'hash' | 'verifiedAt' | 'verifiedBy' | 'provenance' | 'ready'>,
    issues: ValidationIssue[],
  ): void {
    if (!evidence.ready) {
      issues.push({
        code: 'EVIDENCE_NOT_READY',
        message: `${context} evidence for ${evidence.artifact} is not marked ready`,
      });
    }
    if (!evidence.hash) {
      issues.push({
        code: 'EVIDENCE_HASH_MISSING',
        message: `${context} evidence for ${evidence.artifact} must include a cryptographic hash`,
      });
    }
    if (!evidence.verifiedBy) {
      issues.push({
        code: 'EVIDENCE_VERIFIER_MISSING',
        message: `${context} evidence for ${evidence.artifact} must identify the verifier`,
      });
    }
    if (!evidence.provenance) {
      issues.push({
        code: 'EVIDENCE_PROVENANCE_MISSING',
        message: `${context} evidence for ${evidence.artifact} must declare provenance`,
      });
    }
    if (!evidence.verifiedAt || Number.isNaN(Date.parse(evidence.verifiedAt))) {
      issues.push({
        code: 'EVIDENCE_VERIFIED_AT_INVALID',
        message: `${context} evidence for ${evidence.artifact} requires an ISO timestamp`,
      });
    }
  }

  private validatePurpose(input: ComplianceInput, issues: ValidationIssue[]): void {
    const required = new Set(this.operatingPrinciples.purposeLimitation);
    input.purposeTags.forEach((tag) => required.delete(tag));
    if (required.size > 0) {
      issues.push({
        code: 'PURPOSE_MISSING',
        message: `Missing required purpose tags: ${Array.from(required).join(', ')}`,
      });
    }
  }

  private validateResidency(input: ComplianceInput, issues: ValidationIssue[]): void {
    if (this.operatingPrinciples.residencyRequired && !input.residencyEnabled) {
      issues.push({
        code: 'RESIDENCY_DISABLED',
        message: 'Residency routing must be enabled for jurisdiction-aware controls.',
      });
    }
  }

  private validateRetention(input: ComplianceInput, issues: ValidationIssue[]): void {
    if (input.retentionDaysDefault > this.operatingPrinciples.retentionDaysDefault) {
      issues.push({
        code: 'RETENTION_DEFAULT_EXCEEDS',
        message: `Default retention exceeds ${this.operatingPrinciples.retentionDaysDefault} days`,
      });
    }
    if (input.retentionDaysPhi > this.operatingPrinciples.retentionDaysPhi) {
      issues.push({
        code: 'RETENTION_PHI_EXCEEDS',
        message: `PHI retention exceeds ${this.operatingPrinciples.retentionDaysPhi} days`,
      });
    }
  }

  private validateSecurityControls(input: ComplianceInput, issues: ValidationIssue[]): void {
    const checks: [keyof OperatingPrinciples['securityControls'], string][] = [
      ['oidc', 'OIDC/JWT is required'],
      ['mtls', 'mTLS must be enabled'],
      ['fieldLevelEncryption', 'Field-level encryption is required for PHI'],
      ['provenanceLedger', 'Provenance ledger must be immutable and active'],
      ['authorityBinding', 'Authority binding is required for sensitive views'],
    ];

    checks.forEach(([key, message]) => {
      if (!input.securityControls[key]) {
        issues.push({ code: `SEC_${key.toUpperCase()}`, message });
      }
    });
  }

  private validatePerformance(input: ComplianceInput, issues: ValidationIssue[]): void {
    const { performance } = input;
    ensureValue(performance.apiReadP95Ms, 'API read p95 is missing', issues, 'SLO_READ_MISSING');
    ensureValue(performance.apiWriteP95Ms, 'API write p95 is missing', issues, 'SLO_WRITE_MISSING');
    ensureValue(performance.subscriptionsP95Ms, 'Subscription p95 is missing', issues, 'SLO_SUB_MISSING');
    ensureValue(
      performance.ingestEventsPerSecondPerPod,
      'Ingest throughput is missing',
      issues,
      'SLO_INGEST_EPS_MISSING',
    );
    ensureValue(performance.ingestPreStorageP95Ms, 'Ingest pre-storage p95 is missing', issues, 'SLO_INGEST_LAT_MISSING');
    ensureValue(performance.graphOneHopP95Ms, 'Graph one-hop p95 is missing', issues, 'SLO_GRAPH1_MISSING');
    ensureValue(performance.graphTwoToThreeHopP95Ms, 'Graph two-three hop p95 is missing', issues, 'SLO_GRAPH23_MISSING');

    const sloChecks: [number, number, string, string][] = [
      [performance.apiReadP95Ms, this.sloTargets.apiReadP95Ms, 'SLO_API_READ', 'API reads'],
      [performance.apiWriteP95Ms, this.sloTargets.apiWriteP95Ms, 'SLO_API_WRITE', 'API writes'],
      [performance.subscriptionsP95Ms, this.sloTargets.subscriptionsP95Ms, 'SLO_SUBSCRIPTIONS', 'Subscriptions'],
      [performance.ingestPreStorageP95Ms, this.sloTargets.ingestPreStorageP95Ms, 'SLO_INGEST_LATENCY', 'Ingest latency'],
      [performance.graphOneHopP95Ms, this.sloTargets.graphOneHopP95Ms, 'SLO_GRAPH_ONE_HOP', 'Graph 1-hop'],
      [performance.graphTwoToThreeHopP95Ms, this.sloTargets.graphTwoToThreeHopP95Ms, 'SLO_GRAPH_MULTI_HOP', 'Graph 2-3 hop'],
    ];

    sloChecks.forEach(([observed, target, code, label]) => {
      if (observed > target) {
        issues.push({
          code,
          message: `${label} p95 ${observed}ms exceeds target ${target}ms`,
          details: { observed, target },
        });
      }
    });

    if (performance.ingestEventsPerSecondPerPod < this.sloTargets.ingestEventsPerSecondPerPod) {
      issues.push({
        code: 'SLO_INGEST_CAPACITY',
        message: `Ingest throughput ${performance.ingestEventsPerSecondPerPod} ev/s per pod below ${this.sloTargets.ingestEventsPerSecondPerPod}`,
        details: {
          observed: performance.ingestEventsPerSecondPerPod,
          target: this.sloTargets.ingestEventsPerSecondPerPod,
        },
      });
    }
  }

  private validateCosts(input: ComplianceInput, issues: ValidationIssue[]): void {
    const { costs } = input;
    if (costs.ingestCostPerThousand > this.costGuardrails.ingestCostPerThousand) {
      issues.push({
        code: 'COST_INGEST_EXCEEDS',
        message: `Ingest unit cost ${costs.ingestCostPerThousand} exceeds ${this.costGuardrails.ingestCostPerThousand}`,
      });
    }
    if (costs.graphqlCostPerMillion > this.costGuardrails.graphqlCostPerMillion) {
      issues.push({
        code: 'COST_GRAPHQL_EXCEEDS',
        message: `GraphQL unit cost ${costs.graphqlCostPerMillion} exceeds ${this.costGuardrails.graphqlCostPerMillion}`,
      });
    }

    const ingestAlertThreshold =
      (this.costGuardrails.ingestCostPerThousand * this.costGuardrails.alertingThresholdPercentage) / 100;
    const gqlAlertThreshold =
      (this.costGuardrails.graphqlCostPerMillion * this.costGuardrails.alertingThresholdPercentage) / 100;

    if (
      costs.ingestCostPerThousand > ingestAlertThreshold &&
      costs.ingestCostPerThousand <= this.costGuardrails.ingestCostPerThousand
    ) {
      issues.push({
        code: 'COST_INGEST_ALERT',
        message: 'Ingest costs are above the 80% alerting threshold.',
      });
    }
    if (
      costs.graphqlCostPerMillion > gqlAlertThreshold &&
      costs.graphqlCostPerMillion <= this.costGuardrails.graphqlCostPerMillion
    ) {
      issues.push({
        code: 'COST_GRAPHQL_ALERT',
        message: 'GraphQL costs are above the 80% alerting threshold.',
      });
    }
  }

  private validateEpics(input: ComplianceInput, issues: ValidationIssue[]): EpicCoverage[] {
    const progressByEpic = new Map(input.epicProgress.map((progress) => [progress.epicId, progress]));

    return this.epics.map((epic) => {
      const progress = progressByEpic.get(epic.id);
      if (!progress) {
        issues.push({
          code: 'EPIC_MISSING',
          message: `No progress reported for ${epic.id} ${epic.name}`,
        });
        return {
          epicId: epic.id,
          completed: 0,
          total: epic.tasks.length,
          percentComplete: 0,
          missingTasks: epic.tasks.map((task) => task.id),
        } satisfies EpicCoverage;
      }

      const missingTasks = epic.tasks.filter((task) => !progress.completedTasks.has(task.id));
      if (missingTasks.length > 0) {
        issues.push({
          code: 'TASKS_INCOMPLETE',
          message: `${epic.id} incomplete tasks: ${missingTasks.map((t) => t.id).join(', ')}`,
          details: { epic: epic.id, missingTasks: missingTasks.map((t) => t.id) },
        });
      }

      const taskEvidence = progress.taskEvidence ?? [];
      epic.tasks.forEach((task) => {
        const evidence = taskEvidence.find(
          (taskEvidence) => taskEvidence.taskId === task.id || taskEvidence.artifact === task.output,
        );
        if (!evidence) {
          issues.push({
            code: 'TASK_EVIDENCE_MISSING',
            message: `${epic.id} ${task.id} missing evidence for artifact ${task.output}`,
          });
          return;
        }

        this.assertEvidenceCompleteness(`${epic.id}/${task.id}`, evidence, issues);
      });

      const evidenceArtifacts = new Map((progress.evidence ?? []).map((artifact) => [artifact.artifact, artifact]));
      const backoutArtifact = evidenceArtifacts.get(epic.backoutArtifact);
      if (!backoutArtifact) {
        issues.push({
          code: 'BACKOUT_MISSING',
          message: `${epic.id} missing backout artifact ${epic.backoutArtifact}`,
        });
      } else {
        this.assertEvidenceCompleteness(`${epic.id}/backout`, backoutArtifact, issues);
      }

      return {
        epicId: epic.id,
        completed: epic.tasks.length - missingTasks.length,
        total: epic.tasks.length,
        percentComplete: Math.round(((epic.tasks.length - missingTasks.length) / epic.tasks.length) * 100),
        missingTasks: missingTasks.map((task) => task.id),
      } satisfies EpicCoverage;
    });
  }
}

export class PublicHealthComplianceMonitor {
  private readonly history: ValidationReport[] = [];
  private readonly planInstance: PublicHealthPlan;

  constructor(planInstance: PublicHealthPlan = new PublicHealthPlan()) {
    this.planInstance = planInstance;
  }

  recordSnapshot(input: ComplianceInput): ValidationReport {
    const report = this.planInstance.validate(input);
    this.history.push(report);
    return report;
  }

  latest(): ValidationReport | undefined {
    return this.history[this.history.length - 1];
  }

  passingRate(): number {
    if (this.history.length === 0) {
      return 0;
    }
    const passing = this.history.filter((report) => report.ok).length;
    return Math.round((passing / this.history.length) * 100);
  }
}

export const plan = new PublicHealthPlan();
