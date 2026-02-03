// @ts-nocheck
import { neo } from '../neo4j.js';

type FragmentGraphInput = {
  id: string;
  sha256: string;
  sourceType: string;
  requestId: string;
  tenantId: string;
  text: string;
  sourceUri?: string | null;
};

type SummaryGraphInput = {
  id: string;
  tenantId: string;
  requestId: string;
  scope: string;
  focus: string;
  text: string;
};

type TraceLinkGraphInput = {
  fragmentId: string;
  targetType: string;
  targetId: string;
  relation: string;
  score?: number | null;
};

class DoclingGraphRepository {
  private initialized = false;

  private async ensureConstraints() {
    if (this.initialized) return;
    await neo.run(
      `CREATE CONSTRAINT IF NOT EXISTS ON (f:DocFragment) ASSERT f.id IS UNIQUE`,
    );
    await neo.run(
      `CREATE CONSTRAINT IF NOT EXISTS ON (s:DocSummary) ASSERT s.id IS UNIQUE`,
    );
    this.initialized = true;
  }

  async mergeFragments(
    fragments: FragmentGraphInput[],
    context: {
      tenantId: string;
      buildId?: string;
      testId?: string;
      prId?: string;
    },
  ) {
    if (fragments.length === 0) return;
    await this.ensureConstraints();

    // BOLT: Use UNWIND for batched fragment creation/update.
    // Reduces database round-trips from N to 1.
    const params = {
      batch: fragments.map((f) => ({
        id: f.id,
        sha256: f.sha256,
        sourceType: f.sourceType,
        requestId: f.requestId,
        tenantId: f.tenantId,
        text: f.text.slice(0, 2048),
        sourceUri: f.sourceUri || null,
      })),
      buildId: context.buildId || null,
      testId: context.testId || null,
      prId: context.prId || null,
    };

    await neo.run(
      `UNWIND $batch AS op
       MERGE (f:DocFragment { id: op.id })
       ON CREATE SET f.sha256 = op.sha256, f.sourceType = op.sourceType, f.requestId = op.requestId, f.tenantId = op.tenantId, f.textPreview = op.text, f.sourceUri = op.sourceUri, f.createdAt = datetime()
       ON MATCH SET f.sha256 = op.sha256, f.sourceType = op.sourceType, f.requestId = op.requestId, f.tenantId = op.tenantId, f.textPreview = op.text, f.sourceUri = op.sourceUri, f.updatedAt = datetime()
       WITH f, op
       FOREACH (_ IN CASE WHEN $buildId IS NULL THEN [] ELSE [1] END | MERGE (b:Build { id: $buildId, tenantId: op.tenantId }) MERGE (f)-[:DESCRIBES]->(b))
       FOREACH (_ IN CASE WHEN $testId IS NULL THEN [] ELSE [1] END | MERGE (t:TestRun { id: $testId, tenantId: op.tenantId }) MERGE (f)-[:DESCRIBES]->(t))
       FOREACH (_ IN CASE WHEN $prId IS NULL THEN [] ELSE [1] END | MERGE (p:PullRequest { id: $prId, tenantId: op.tenantId }) MERGE (f)-[:DESCRIBES]->(p))`,
      params,
    );
  }

  async mergeSummary(
    summary: SummaryGraphInput,
    context: { buildId?: string; tenantId: string },
  ) {
    await this.ensureConstraints();
    await neo.run(
      `MERGE (s:DocSummary { id: $id })
       ON CREATE SET s.tenantId = $tenantId, s.requestId = $requestId, s.scope = $scope, s.focus = $focus, s.text = $text, s.createdAt = datetime()
       ON MATCH SET s.scope = $scope, s.focus = $focus, s.text = $text, s.updatedAt = datetime()
       WITH s
       FOREACH (_ IN CASE WHEN $buildId IS NULL THEN [] ELSE [1] END | MERGE (b:Build { id: $buildId, tenantId: $tenantId }) MERGE (s)-[:SUMMARIZES]->(b))`,
      {
        id: summary.id,
        tenantId: summary.tenantId,
        requestId: summary.requestId,
        scope: summary.scope,
        focus: summary.focus,
        text: summary.text.slice(0, 4096),
        buildId: context.buildId || null,
      },
    );
  }

  async linkTrace(
    requestId: string,
    tenantId: string,
    links: TraceLinkGraphInput[],
  ) {
    if (links.length === 0) return;
    await this.ensureConstraints();

    // BOLT: Batch trace links using UNWIND.
    const params = {
      links: links.map((link) => ({
        fragmentId: link.fragmentId,
        targetId: link.targetId,
        targetType: link.targetType,
        relation: link.relation,
        score: link.score || null,
      })),
      tenantId,
      requestId,
    };

    await neo.run(
      `UNWIND $links AS link
       MATCH (f:DocFragment { id: link.fragmentId })
       MERGE (t:DocTarget { id: link.targetId, tenantId: $tenantId })
       SET t.type = link.targetType
       MERGE (f)-[r:TRACE_LINK { requestId: $requestId, relation: link.relation }]->(t)
       SET r.score = link.score, r.updatedAt = datetime()`,
      params,
    );
  }
}

export const doclingGraphRepository = new DoclingGraphRepository();
