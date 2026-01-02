/**
 * Compliance Assessment DataLoader - Batch loading for compliance assessments
 * Prevents N+1 query issues when fetching assessment data
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module graphql/dataloaders/complianceAssessmentLoader
 */

import DataLoader from 'dataloader';
import { v4 as uuidv4 } from 'uuid';
import type { DataLoaderContext } from './index.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../../types/data-envelope.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceAssessment {
  id: string;
  tenantId: string;
  framework: string;
  controlId: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_assessed';
  score: number;
  evidenceIds: string[];
  assessedAt: string;
  assessedBy: string;
  nextAssessmentDue: string | null;
  findings: AssessmentFinding[];
  metadata: Record<string, unknown>;
}

export interface AssessmentFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  remediation: string | null;
  status: 'open' | 'resolved' | 'accepted';
}

export interface ComplianceAssessmentWithVerdict extends ComplianceAssessment {
  governanceVerdict: GovernanceVerdict;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'compliance-dataloader-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'ComplianceAssessmentLoader',
  };
}

// ============================================================================
// Batch Load Functions
// ============================================================================

/**
 * Batch function for loading compliance assessments by ID
 */
async function batchLoadAssessments(
  ids: readonly string[],
  context: DataLoaderContext
): Promise<(ComplianceAssessmentWithVerdict | Error)[]> {
  const { redis, tenantId, pgPool } = context;
  const assessmentMap = new Map<string, ComplianceAssessmentWithVerdict>();
  const missingIds: string[] = [];

  // 1. Try to load from Redis cache first
  if (redis) {
    try {
      const keys = ids.map((id) => `assessment:${tenantId}:${id}`);
      const cachedValues = await redis.mget(keys);

      cachedValues.forEach((val: any, index: any) => {
        if (val) {
          try {
            const assessment = JSON.parse(val);
            assessmentMap.set(ids[index], {
              ...assessment,
              governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Loaded from cache'),
            });
          } catch {
            missingIds.push(ids[index]);
          }
        } else {
          missingIds.push(ids[index]);
        }
      });
    } catch (error: any) {
      logger.warn({ error }, 'Redis cache error in complianceAssessmentLoader');
      missingIds.push(...ids.filter(id => !assessmentMap.has(id)));
    }
  } else {
    missingIds.push(...ids);
  }

  // 2. Load missing assessments from PostgreSQL
  if (missingIds.length > 0) {
    const client = context.pgClient || await pgPool.connect();
    const shouldRelease = !context.pgClient;

    try {
      const startTime = Date.now();

      // Single query to fetch all requested assessments with their findings
      const result = await client.query(
        `
        SELECT
          ca.id,
          ca.tenant_id,
          ca.framework,
          ca.control_id,
          ca.status,
          ca.score,
          ca.evidence_ids,
          ca.assessed_at,
          ca.assessed_by,
          ca.next_assessment_due,
          ca.metadata,
          COALESCE(
            json_agg(
              json_build_object(
                'id', cf.id,
                'severity', cf.severity,
                'title', cf.title,
                'description', cf.description,
                'remediation', cf.remediation,
                'status', cf.status
              )
            ) FILTER (WHERE cf.id IS NOT NULL),
            '[]'
          ) as findings
        FROM compliance_assessments ca
        LEFT JOIN compliance_findings cf ON cf.assessment_id = ca.id
        WHERE ca.tenant_id = $1 AND ca.id = ANY($2)
        GROUP BY ca.id
        `,
        [tenantId, missingIds]
      );

      const dbAssessments = new Map<string, ComplianceAssessmentWithVerdict>();

      for (const row of result.rows) {
        const assessment: ComplianceAssessmentWithVerdict = {
          id: row.id,
          tenantId: row.tenant_id,
          framework: row.framework,
          controlId: row.control_id,
          status: row.status,
          score: row.score,
          evidenceIds: row.evidence_ids || [],
          assessedAt: row.assessed_at,
          assessedBy: row.assessed_by,
          nextAssessmentDue: row.next_assessment_due,
          findings: row.findings || [],
          metadata: row.metadata || {},
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Loaded from database'),
        };
        dbAssessments.set(assessment.id, assessment);
        assessmentMap.set(assessment.id, assessment);
      }

      // Cache the newly fetched assessments
      if (redis && dbAssessments.size > 0) {
        const pipeline = redis.pipeline();
        for (const [id, assessment] of dbAssessments.entries()) {
          const { governanceVerdict, ...cacheData } = assessment;
          pipeline.setex(
            `assessment:${tenantId}:${id}`,
            300, // 5 minutes TTL
            JSON.stringify(cacheData)
          );
        }
        await pipeline.exec();
      }

      const duration = Date.now() - startTime;
      logger.debug(
        {
          batchSize: missingIds.length,
          found: dbAssessments.size,
          duration,
        },
        'Compliance assessment batch load completed'
      );
    } catch (error: any) {
      logger.error({ error, ids: missingIds }, 'Error in compliance assessment batch loader');
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  // Return assessments in the same order as requested IDs
  return ids.map((id) => {
    const assessment = assessmentMap.get(id);
    if (!assessment) {
      return new Error(`Compliance assessment not found: ${id}`);
    }
    return assessment;
  });
}

/**
 * Batch function for loading assessments by control ID
 */
async function batchLoadAssessmentsByControl(
  controlIds: readonly string[],
  context: DataLoaderContext
): Promise<(ComplianceAssessmentWithVerdict[] | Error)[]> {
  const { tenantId, pgPool } = context;
  const client = context.pgClient || await pgPool.connect();
  const shouldRelease = !context.pgClient;

  try {
    const result = await client.query(
      `
      SELECT
        ca.id,
        ca.tenant_id,
        ca.framework,
        ca.control_id,
        ca.status,
        ca.score,
        ca.evidence_ids,
        ca.assessed_at,
        ca.assessed_by,
        ca.next_assessment_due,
        ca.metadata,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cf.id,
              'severity', cf.severity,
              'title', cf.title,
              'description', cf.description,
              'remediation', cf.remediation,
              'status', cf.status
            )
          ) FILTER (WHERE cf.id IS NOT NULL),
          '[]'
        ) as findings
      FROM compliance_assessments ca
      LEFT JOIN compliance_findings cf ON cf.assessment_id = ca.id
      WHERE ca.tenant_id = $1 AND ca.control_id = ANY($2)
      GROUP BY ca.id
      ORDER BY ca.assessed_at DESC
      `,
      [tenantId, controlIds as string[]]
    );

    // Group assessments by control ID
    const assessmentsByControl = new Map<string, ComplianceAssessmentWithVerdict[]>();

    for (const row of result.rows) {
      const assessment: ComplianceAssessmentWithVerdict = {
        id: row.id,
        tenantId: row.tenant_id,
        framework: row.framework,
        controlId: row.control_id,
        status: row.status,
        score: row.score,
        evidenceIds: row.evidence_ids || [],
        assessedAt: row.assessed_at,
        assessedBy: row.assessed_by,
        nextAssessmentDue: row.next_assessment_due,
        findings: row.findings || [],
        metadata: row.metadata || {},
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Loaded by control'),
      };

      const existing = assessmentsByControl.get(assessment.controlId) || [];
      existing.push(assessment);
      assessmentsByControl.set(assessment.controlId, existing);
    }

    return controlIds.map((controlId) => assessmentsByControl.get(controlId) || []);
  } catch (error: any) {
    logger.error({ error, controlIds }, 'Error loading assessments by control');
    return controlIds.map(() => new Error('Failed to load assessments'));
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
}

/**
 * Batch function for loading assessments by framework
 */
async function batchLoadAssessmentsByFramework(
  frameworks: readonly string[],
  context: DataLoaderContext
): Promise<(ComplianceAssessmentWithVerdict[] | Error)[]> {
  const { tenantId, pgPool } = context;
  const client = context.pgClient || await pgPool.connect();
  const shouldRelease = !context.pgClient;

  try {
    const result = await client.query(
      `
      SELECT
        ca.id,
        ca.tenant_id,
        ca.framework,
        ca.control_id,
        ca.status,
        ca.score,
        ca.evidence_ids,
        ca.assessed_at,
        ca.assessed_by,
        ca.next_assessment_due,
        ca.metadata,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cf.id,
              'severity', cf.severity,
              'title', cf.title,
              'description', cf.description,
              'remediation', cf.remediation,
              'status', cf.status
            )
          ) FILTER (WHERE cf.id IS NOT NULL),
          '[]'
        ) as findings
      FROM compliance_assessments ca
      LEFT JOIN compliance_findings cf ON cf.assessment_id = ca.id
      WHERE ca.tenant_id = $1 AND ca.framework = ANY($2)
      GROUP BY ca.id
      ORDER BY ca.assessed_at DESC
      `,
      [tenantId, frameworks as string[]]
    );

    // Group assessments by framework
    const assessmentsByFramework = new Map<string, ComplianceAssessmentWithVerdict[]>();

    for (const row of result.rows) {
      const assessment: ComplianceAssessmentWithVerdict = {
        id: row.id,
        tenantId: row.tenant_id,
        framework: row.framework,
        controlId: row.control_id,
        status: row.status,
        score: row.score,
        evidenceIds: row.evidence_ids || [],
        assessedAt: row.assessed_at,
        assessedBy: row.assessed_by,
        nextAssessmentDue: row.next_assessment_due,
        findings: row.findings || [],
        metadata: row.metadata || {},
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Loaded by framework'),
      };

      const existing = assessmentsByFramework.get(assessment.framework) || [];
      existing.push(assessment);
      assessmentsByFramework.set(assessment.framework, existing);
    }

    return frameworks.map((framework) => assessmentsByFramework.get(framework) || []);
  } catch (error: any) {
    logger.error({ error, frameworks }, 'Error loading assessments by framework');
    return frameworks.map(() => new Error('Failed to load assessments'));
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
}

// ============================================================================
// Loader Creation
// ============================================================================

/**
 * Creates a new Compliance Assessment DataLoader
 */
export function createComplianceAssessmentLoader(
  context: DataLoaderContext
) {
  return new DataLoader(
    // @ts-ignore
    (ids) => batchLoadAssessments(ids, context),
    {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    }
  );
}

/**
 * Creates a DataLoader for loading assessments by control ID
 */
export function createAssessmentsByControlLoader(
  context: DataLoaderContext
): DataLoader<string, ComplianceAssessmentWithVerdict[]> {
  return new DataLoader<string, ComplianceAssessmentWithVerdict[]>(
    (controlIds) => batchLoadAssessmentsByControl(controlIds, context),
    {
      cache: true,
      maxBatchSize: 50,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    }
  );
}

/**
 * Creates a DataLoader for loading assessments by framework
 */
export function createAssessmentsByFrameworkLoader(
  context: DataLoaderContext
): DataLoader<string, ComplianceAssessmentWithVerdict[]> {
  return new DataLoader<string, ComplianceAssessmentWithVerdict[]>(
    (frameworks) => batchLoadAssessmentsByFramework(frameworks, context),
    {
      cache: true,
      maxBatchSize: 20,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    }
  );
}

export default createComplianceAssessmentLoader;
