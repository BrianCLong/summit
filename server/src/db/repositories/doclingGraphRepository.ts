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
    await this.ensureConstraints();
    for (const fragment of fragments) {
      const params = {
        id: fragment.id,
        sha256: fragment.sha256,
        sourceType: fragment.sourceType,
        requestId: fragment.requestId,
        tenantId: fragment.tenantId,
        text: fragment.text.slice(0, 2048),
        sourceUri: fragment.sourceUri || null,
        buildId: context.buildId || null,
        testId: context.testId || null,
        prId: context.prId || null,
      };
      await neo.run(
        `MERGE (f:DocFragment { id: $id })
         ON CREATE SET f.sha256 = $sha256, f.sourceType = $sourceType, f.requestId = $requestId, f.tenantId = $tenantId, f.textPreview = $text, f.sourceUri = $sourceUri, f.createdAt = datetime()
         ON MATCH SET f.sha256 = $sha256, f.sourceType = $sourceType, f.requestId = $requestId, f.tenantId = $tenantId, f.textPreview = $text, f.sourceUri = $sourceUri, f.updatedAt = datetime()
         WITH f
         FOREACH (_ IN CASE WHEN $buildId IS NULL THEN [] ELSE [1] END | MERGE (b:Build { id: $buildId, tenantId: $tenantId }) MERGE (f)-[:DESCRIBES]->(b))
         FOREACH (_ IN CASE WHEN $testId IS NULL THEN [] ELSE [1] END | MERGE (t:TestRun { id: $testId, tenantId: $tenantId }) MERGE (f)-[:DESCRIBES]->(t))
         FOREACH (_ IN CASE WHEN $prId IS NULL THEN [] ELSE [1] END | MERGE (p:PullRequest { id: $prId, tenantId: $tenantId }) MERGE (f)-[:DESCRIBES]->(p))`,
        params,
      );
    }
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
    await this.ensureConstraints();
    for (const link of links) {
      await neo.run(
        `MATCH (f:DocFragment { id: $fragmentId })
         MERGE (t:DocTarget { id: $targetId, tenantId: $tenantId })
         SET t.type = $targetType
         MERGE (f)-[r:TRACE_LINK { requestId: $requestId, relation: $relation }]->(t)
         SET r.score = $score, r.updatedAt = datetime()`,
        {
          fragmentId: link.fragmentId,
          targetId: link.targetId,
          targetType: link.targetType,
          relation: link.relation,
          score: link.score || null,
          tenantId,
          requestId,
        },
      );
    }
  }
}

export const doclingGraphRepository = new DoclingGraphRepository();
