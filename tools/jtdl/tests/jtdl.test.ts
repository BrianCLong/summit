import path from 'node:path';
import { buildImpactReport } from '../src/report.js';
import { verifySignature } from '../src/signature.js';

const fixturesRoot = path.resolve(process.cwd(), 'tools/jtdl');
const taxonomyDir = path.join(fixturesRoot, 'fixtures', 'taxonomy');
const repoFixture = path.join(fixturesRoot, 'fixtures', 'repo');

const baselinePath = path.join(taxonomyDir, 'baseline.json');
const updatePath = path.join(taxonomyDir, 'update.json');

const signingKey = 'test-secret';
const keyId = 'test-key';

describe('JTDL impact analysis', () => {
  it('generates deterministic hotspots and verifiable signature', async () => {
    const report = await buildImpactReport({
      baselinePath,
      updatedPath: updatePath,
      repoRoot: repoFixture,
      signingKey,
      keyId,
    });

    expect(report.baselineVersion).toBe('2025-01-01');
    expect(report.updatedVersion).toBe('2025-03-01');
    expect(report.diff.added.map((item) => item.id)).toEqual([
      'synthetic-identities',
    ]);
    expect(report.diff.removed).toEqual([]);

    expect(
      report.diff.updated.map((change) => ({
        id: change.id,
        lawfulBases: change.delta?.lawfulBases ?? null,
        retentionMinimumDays: change.delta?.retentionMinimumDays ?? null,
        description: change.delta?.description ?? null,
      })),
    ).toEqual([
      {
        id: 'engagement-metrics',
        lawfulBases: null,
        retentionMinimumDays: {
          before: 90,
          after: 120,
        },
        description: {
          before: 'Aggregated behavioral analytics',
          after: 'Aggregated behavioral analytics with event-level sampling',
        },
      },
      {
        id: 'health-data',
        lawfulBases: null,
        retentionMinimumDays: {
          before: 730,
          after: 1095,
        },
        description: null,
      },
    ]);

    const hotspotSummary = report.hotspots.map((hotspot) => ({
      scope: hotspot.scope,
      dataClassId: hotspot.dataClassId,
      reason: hotspot.reason,
      files: hotspot.matches.map((match) => `${match.file}:L${match.line}`),
    }));

    expect(hotspotSummary).toEqual([
      {
        scope: 'contracts',
        dataClassId: 'engagement-metrics',
        reason: 'retention minimum updated, description updated',
        files: ['contracts/dpa.txt:L3'],
      },
      {
        scope: 'contracts',
        dataClassId: 'health-data',
        reason: 'retention minimum updated',
        files: ['contracts/dpa.txt:L2'],
      },
      {
        scope: 'rules',
        dataClassId: 'health-data',
        reason: 'retention minimum updated',
        files: ['rules/policy.rule.ts:L2'],
      },
      {
        scope: 'schemas',
        dataClassId: 'health-data',
        reason: 'retention minimum updated',
        files: ['schemas/health.schema.json:L7'],
      },
      {
        scope: 'prompts',
        dataClassId: 'synthetic-identities',
        reason: 'new data class registered',
        files: ['prompts/redaction.md:L3'],
      },
      {
        scope: 'rules',
        dataClassId: 'synthetic-identities',
        reason: 'new data class registered',
        files: ['rules/policy.rule.ts:L6'],
      },
    ]);

    const { signature, ...payload } = report;
    expect(verifySignature(payload, signature, signingKey)).toBe(true);
    expect(signature.keyId).toBe(keyId);
  });
});
