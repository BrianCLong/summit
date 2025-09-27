import { Worker, Job } from 'bullmq';
import { Pool } from 'pg';
import { buildDerivedPolicies, DerivedRetentionPolicy } from '../../../server/src/privacy/retention';
import { createEvidence } from './evidence_collector';

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const subjectPolicies = buildDerivedPolicies().filter(policy => Boolean(policy.subjectKey));

function generateAnonymizedValues(policy: DerivedRetentionPolicy, recordId: string): Record<string, string> {
  const token = recordId.replace(/-/g, '').slice(0, 16);
  const values: Record<string, string> = {};
  for (const field of policy.anonymizeFields) {
    const lower = field.toLowerCase();
    if (lower.includes('email')) {
      values[field] = `anonymized+${token}@privacy.invalid`;
    } else if (lower.includes('username') || lower.includes('user')) {
      values[field] = `anon_${token}`;
    } else if (lower.includes('name')) {
      values[field] = 'Redacted';
    } else {
      values[field] = '[REDACTED]';
    }
  }
  return values;
}

async function insertTombstones(
  policy: DerivedRetentionPolicy,
  recordIds: string[],
  requestId: string,
  action: 'delete' | 'anonymize'
): Promise<void> {
  if (recordIds.length === 0) return;

  await pgPool.query(
    `INSERT INTO privacy_tombstones (table_name, primary_key_column, record_id, action, rtbf_request_id, metadata)
     SELECT $1, $2, UNNEST($3::text[]), $4, $5::uuid, $6::jsonb
     ON CONFLICT (table_name, primary_key_column, record_id)
     DO UPDATE SET
       action = EXCLUDED.action,
       rtbf_request_id = EXCLUDED.rtbf_request_id,
       metadata = privacy_tombstones.metadata || EXCLUDED.metadata,
       created_at = NOW()`,
    [
      policy.tableName,
      policy.primaryKeyColumn,
      recordIds,
      action,
      requestId,
      JSON.stringify({ trigger: 'rtbf', retentionTier: policy.retentionTier })
    ]
  );
}

async function processPolicyForSubject(
  policy: DerivedRetentionPolicy,
  subjectId: string,
  requestId: string
): Promise<{ policy: string; action: string; affected: number }> {
  if (!policy.subjectKey) {
    return { policy: policy.name, action: policy.action, affected: 0 };
  }

  if (policy.action === 'anonymize' && policy.anonymizeFields.length === 0) {
    return { policy: policy.name, action: policy.action, affected: 0 };
  }

  if (policy.action === 'anonymize') {
    const anonymizedValues = generateAnonymizedValues(policy, subjectId);
    const assignments: string[] = [];
    const values: unknown[] = [subjectId];
    let placeholder = 2;

    for (const [column, value] of Object.entries(anonymizedValues)) {
      assignments.push(`${column} = $${placeholder}`);
      values.push(value);
      placeholder++;
    }

    if (policy.labelColumn) {
      assignments.push(`${policy.labelColumn} = 'rtbf-anonymize'`);
    }
    if (policy.expiresColumn) {
      assignments.push(`${policy.expiresColumn} = NULL`);
    }
    if (policy.tombstoneColumn) {
      assignments.push(`${policy.tombstoneColumn} = COALESCE(${policy.tombstoneColumn}, NOW())`);
    }

    assignments.push(`updated_at = NOW()`);

    const updateResult = await pgPool.query(
      `UPDATE ${policy.tableName}
          SET ${assignments.join(', ')}
        WHERE ${policy.subjectKey}::text = $1
        RETURNING ${policy.primaryKeyColumn}::text AS id`,
      values
    );

    const ids = updateResult.rows.map(row => row.id as string);
    await insertTombstones(policy, ids, requestId, 'anonymize');
    return { policy: policy.name, action: 'anonymize', affected: ids.length };
  }

  const deleteResult = await pgPool.query(
    `DELETE FROM ${policy.tableName}
      WHERE ${policy.subjectKey}::text = $1
      RETURNING ${policy.primaryKeyColumn}::text AS id`,
    [subjectId]
  );

  const ids = deleteResult.rows.map(row => row.id as string);
  await insertTombstones(policy, ids, requestId, 'delete');
  return { policy: policy.name, action: 'delete', affected: ids.length };
}

const rtbfWorker = new Worker(
  'rtbf_queue',
  async (job: Job) => {
    const { subject_id, tenant, request_id } = job.data;
    console.log(`Processing RTBF request for subject ${subject_id}`);

    const client = await pgPool.connect();

    try {
      const requestResult = request_id
        ? await client.query('SELECT * FROM privacy_rtbf_requests WHERE id = $1', [request_id])
        : await client.query(
            `SELECT * FROM privacy_rtbf_requests
               WHERE subject_id = $1 AND tenant = $2
               ORDER BY requested_at DESC LIMIT 1`,
            [subject_id, tenant]
          );

      if (requestResult.rows.length === 0) {
        throw new Error('RTBF request not found');
      }

      const request = requestResult.rows[0];

      await client.query(
        `UPDATE privacy_rtbf_requests
            SET status = 'processing', processed_at = NULL
          WHERE id = $1`,
        [request.id]
      );

      const outcomes: { policy: string; action: string; affected: number }[] = [];
      for (const policy of subjectPolicies) {
        const outcome = await processPolicyForSubject(policy, subject_id, request.id);
        outcomes.push(outcome);
      }

      const evidence = await createEvidence({
        tenant,
        action: 'rtbf_request_completed',
        subject: subject_id,
        resourceType: 'privacy_rtbf_request',
        resourceId: request.id,
        actorId: request.requested_by || undefined,
        details: {
          outcomes,
          requestId: request.id,
          tenant
        }
      });

      await client.query(
        `UPDATE privacy_rtbf_requests
            SET status = 'completed',
                processed_at = NOW(),
                result = $2::jsonb,
                audit_reference = $3
          WHERE id = $1`,
        [request.id, { outcomes }, evidence.signature]
      );

      console.log(`Successfully completed RTBF request for ${subject_id}`);
      return { success: true, outcomes };
    } catch (error) {
      console.error(`Failed to process RTBF request for ${subject_id}:`, error);
      await client.query(
        `UPDATE privacy_rtbf_requests
            SET status = 'failed',
                result = jsonb_build_object('error', $2)
          WHERE subject_id = $1 AND status <> 'completed'`,
        [subject_id, (error as Error).message]
      );
      throw error;
    } finally {
      client.release();
    }
  },
  {
    connection: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379', 10) },
  }
);

console.log('RTBF worker started.');
