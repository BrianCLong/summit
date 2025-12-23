// @ts-nocheck
import { neo } from '../../db/neo4j.js';
import { Run } from '../runs/runs-repo.js';

export interface GraphEvidence {
  id: string;
  runId: string;
  artifactType: string;
  hash: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface GraphClaim {
  id: string;
  runId: string;
  statement: string;
  evidence: string[];
  confidence: number;
  source: string;
  timestamp: string;
}

export class IntelGraphService {
  /**
   * Creates or updates a Run node in the graph.
   */
  async pushRun(run: Run): Promise<void> {
    const cypher = `
      MERGE (r:Run {id: $id})
      SET r.pipelineId = $pipelineId,
          r.pipelineName = $pipelineName,
          r.status = $status,
          r.startedAt = $startedAt,
          r.completedAt = $completedAt,
          r.durationMs = $durationMs,
          r.cost = $cost,
          r.tenantId = $tenantId,
          r.updatedAt = datetime()

      WITH r
      MATCH (p:Pipeline {id: $pipelineId})
      MERGE (r)-[:INSTANCE_OF]->(p)
    `;

    await neo.run(cypher, {
      id: run.id,
      pipelineId: run.pipeline_id,
      pipelineName: run.pipeline,
      status: run.status,
      startedAt: run.started_at ? run.started_at.toISOString() : null,
      completedAt: run.completed_at ? run.completed_at.toISOString() : null,
      durationMs: run.duration_ms,
      cost: run.cost,
      tenantId: run.tenant_id,
    });
  }

  /**
   * Creates an Evidence node and links it to the Run.
   */
  async pushEvidence(evidence: GraphEvidence): Promise<void> {
    const cypher = `
      MERGE (e:Evidence {id: $id})
      SET e.artifactType = $artifactType,
          e.hash = $hash,
          e.timestamp = $timestamp,
          e.metadata = $metadata

      WITH e
      MATCH (r:Run {id: $runId})
      MERGE (r)-[:GENERATED]->(e)
    `;

    await neo.run(cypher, {
      id: evidence.id,
      runId: evidence.runId,
      artifactType: evidence.artifactType,
      hash: evidence.hash,
      timestamp: evidence.timestamp,
      metadata: JSON.stringify(evidence.metadata || {}),
    });
  }

  /**
   * Creates a Claim (Decision) node and links it to Evidence and Run.
   */
  async pushClaim(claim: GraphClaim): Promise<void> {
    const cypher = `
      MERGE (c:Claim {id: $id})
      SET c.statement = $statement,
          c.confidence = $confidence,
          c.source = $source,
          c.timestamp = $timestamp

      WITH c
      MATCH (r:Run {id: $runId})
      MERGE (r)-[:MADE_CLAIM]->(c)

      WITH c
      UNWIND $evidenceIds as evId
      MATCH (e:Evidence {id: evId})
      MERGE (c)-[:SUPPORTED_BY]->(e)
    `;

    await neo.run(cypher, {
      id: claim.id,
      runId: claim.runId,
      statement: claim.statement,
      confidence: claim.confidence,
      source: claim.source,
      timestamp: claim.timestamp,
      evidenceIds: claim.evidence,
    });
  }
}

export const intelGraphService = new IntelGraphService();
