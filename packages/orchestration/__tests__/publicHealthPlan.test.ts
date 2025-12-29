import {
  plan,
  PublicHealthComplianceMonitor,
  PublicHealthPlan,
  PurposeTag,
} from '../src/publicHealthPlan.js';

const baseComplianceInput = {
  purposeTags: ['public-health'] as PurposeTag[],
  residencyEnabled: true,
  retentionDaysDefault: 365,
  retentionDaysPhi: 30,
  securityControls: {
    oidc: true,
    mtls: true,
    fieldLevelEncryption: true,
    provenanceLedger: true,
    authorityBinding: true,
  },
  performance: {
    apiReadP95Ms: 320,
    apiWriteP95Ms: 650,
    subscriptionsP95Ms: 200,
    ingestEventsPerSecondPerPod: 1200,
    ingestPreStorageP95Ms: 80,
    graphOneHopP95Ms: 250,
    graphTwoToThreeHopP95Ms: 1000,
  },
  costs: {
    ingestCostPerThousand: 0.08,
    graphqlCostPerMillion: 1.5,
  },
  epicProgress: [],
};
const nowIso = new Date().toISOString();
const completedEpicProgress = plan.epics.map((epic) => ({
  epicId: epic.id,
  completedTasks: new Set(epic.tasks.map((task) => task.id)),
  taskEvidence: epic.tasks.map((task) => ({
    taskId: task.id,
    artifact: task.output,
    ready: true,
    hash: `sha256-${task.id}`,
    verifiedBy: 'qa-bot',
    verifiedAt: nowIso,
    provenance: `epic:${epic.id}:${task.id}`,
    evidence: 'slo:pass',
  })),
  evidence: [
    {
      artifact: epic.backoutArtifact,
      ready: true,
      hash: `sha256-${epic.backoutArtifact}`,
      verifiedBy: 'qa-bot',
      verifiedAt: nowIso,
      provenance: `epic:${epic.id}:backout`,
      evidence: 'backout-ready',
    },
  ],
}));

describe('PublicHealthPlan', () => {
  it('declares the full set of epics and tasks from the orchestration plan', () => {
    const epicsWithTasks = plan.epics.map((epic) => ({ id: epic.id, taskCount: epic.tasks.length }));
    expect(epicsWithTasks).toEqual(
      expect.arrayContaining([
        { id: 'EP1', taskCount: 14 },
        { id: 'EP2', taskCount: 14 },
        { id: 'EP3', taskCount: 11 },
        { id: 'EP4', taskCount: 10 },
        { id: 'EP5', taskCount: 13 },
        { id: 'EP6', taskCount: 11 },
        { id: 'EP7', taskCount: 11 },
        { id: 'EP8', taskCount: 11 },
        { id: 'EP9', taskCount: 11 },
        { id: 'EP10', taskCount: 10 },
        { id: 'EP11', taskCount: 11 },
      ]),
    );
  });

  it('passes validation when all principles, SLOs, cost guardrails, and artifacts are satisfied', () => {
    const report = plan.validate({
      ...baseComplianceInput,
      epicProgress: completedEpicProgress,
    });

    expect(report.ok).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.snapshotId).toMatch(/[0-9a-fA-F-]{36}/);
    expect(report.epicCoverage.every((coverage) => coverage.percentComplete === 100)).toBe(true);
  });

  it('fails validation when SLOs, purpose tags, and tasks are violated', () => {
    const failingPlan = new PublicHealthPlan();
    const report = failingPlan.validate({
      ...baseComplianceInput,
      purposeTags: ['research'],
      performance: {
        ...baseComplianceInput.performance,
        apiReadP95Ms: 500,
        graphTwoToThreeHopP95Ms: 1500,
        ingestEventsPerSecondPerPod: 400,
      },
      costs: {
        ingestCostPerThousand: 0.11,
        graphqlCostPerMillion: 2.5,
      },
      epicProgress: [
        {
          epicId: 'EP1',
          completedTasks: new Set(['EP1-T01']),
          taskEvidence: [],
          evidence: [
            {
              artifact: 'boundary.md',
              ready: true,
              hash: '',
              verifiedBy: '',
              verifiedAt: '',
              provenance: '',
            },
          ],
        },
      ],
      residencyEnabled: false,
      retentionDaysDefault: 400,
      retentionDaysPhi: 45,
      securityControls: {
        oidc: false,
        mtls: false,
        fieldLevelEncryption: false,
        provenanceLedger: false,
        authorityBinding: false,
      },
    });

    const codes = report.issues.map((issue) => issue.code);
    expect(report.ok).toBe(false);
    expect(codes).toEqual(
      expect.arrayContaining([
        'PURPOSE_MISSING',
        'RESIDENCY_DISABLED',
        'RETENTION_DEFAULT_EXCEEDS',
        'RETENTION_PHI_EXCEEDS',
        'SEC_OIDC',
        'SEC_MTLS',
        'SEC_FIELDLEVELENCRYPTION',
        'SEC_PROVENANCELEDGER',
        'SEC_AUTHORITYBINDING',
        'SLO_API_READ',
        'SLO_GRAPH_MULTI_HOP',
        'SLO_INGEST_CAPACITY',
        'COST_INGEST_EXCEEDS',
        'COST_GRAPHQL_EXCEEDS',
        'EPIC_MISSING',
        'TASKS_INCOMPLETE',
        'BACKOUT_MISSING',
        'TASK_EVIDENCE_MISSING',
        'EVIDENCE_HASH_MISSING',
        'EVIDENCE_VERIFIER_MISSING',
        'EVIDENCE_PROVENANCE_MISSING',
        'EVIDENCE_VERIFIED_AT_INVALID',
      ]),
    );
  });

  it('tracks compliance history through the monitor', () => {
    const monitor = new PublicHealthComplianceMonitor();
    const failingSnapshot = monitor.recordSnapshot({
      ...baseComplianceInput,
      epicProgress: [],
    });

    const passingSnapshot = monitor.recordSnapshot({
      ...baseComplianceInput,
      epicProgress: completedEpicProgress,
    });

    expect(failingSnapshot.ok).toBe(false);
    expect(passingSnapshot.ok).toBe(true);
    expect(monitor.latest()).toEqual(passingSnapshot);
    expect(monitor.passingRate()).toBe(50);
  });
});
