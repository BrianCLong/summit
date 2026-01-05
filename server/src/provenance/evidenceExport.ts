import { pool } from '../db/pg.js';

export interface EvidenceExportWindow {
  start: Date;
  end: Date;
}

export interface EvidenceExportPayload {
  accessLogs: any[];
  adminChangeReceipts: any[];
  policyVersions: any[];
  drReceipts: any[];
}

const ADMIN_ACTION_TYPES = [
  'TENANT_CREATED',
  'TENANT_SETTINGS_UPDATED',
  'TENANT_DISABLED',
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'ROLE_DELETED',
  'ROLE_ASSIGNED',
  'ROLE_REVOKED',
  'ROLES_LISTED',
];

const DR_RECEIPT_TYPES = [
  'dr_receipt',
  'disaster_recovery_receipt',
  'receipt',
];

export async function exportEvidencePayload(
  tenantId: string,
  window: EvidenceExportWindow,
): Promise<EvidenceExportPayload> {
  const [accessLogs, adminChangeReceipts, policyVersions, drReceipts] =
    await Promise.all([
      pool.query(
        `
        SELECT *
        FROM maestro.audit_access_logs
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        ORDER BY created_at DESC
      `,
        [tenantId, window.start, window.end],
      ),
      pool.query(
        `
        SELECT id,
               tenant_id,
               action_type,
               resource_type,
               resource_id,
               actor_id,
               actor_type,
               timestamp,
               metadata,
               payload,
               current_hash
        FROM provenance_ledger_v2
        WHERE tenant_id = $1
          AND action_type = ANY($2)
          AND timestamp >= $3
          AND timestamp <= $4
        ORDER BY timestamp DESC
      `,
        [tenantId, ADMIN_ACTION_TYPES, window.start, window.end],
      ),
      pool.query(
        `
        SELECT
          pv.id,
          pv.policy_id,
          pv.version,
          pv.status,
          pv.created_by,
          pv.created_at,
          pv.approved_by,
          pv.approved_at,
          pv.content,
          mp.name as policy_name,
          mp.tenant_id
        FROM policy_versions pv
        JOIN managed_policies mp ON mp.id = pv.policy_id
        WHERE mp.tenant_id = $1
          AND pv.created_at >= $2
          AND pv.created_at <= $3
        ORDER BY pv.created_at DESC
      `,
        [tenantId, window.start, window.end],
      ),
      pool.query(
        `
        SELECT
          id,
          artifact_type,
          storage_uri,
          sha256,
          classification_level,
          content_preview,
          created_at,
          tenant_id
        FROM evidence_artifacts
        WHERE tenant_id = $1
          AND artifact_type = ANY($2)
          AND created_at >= $3
          AND created_at <= $4
        ORDER BY created_at DESC
      `,
        [tenantId, DR_RECEIPT_TYPES, window.start, window.end],
      ),
    ]);

  return {
    accessLogs: accessLogs.rows,
    adminChangeReceipts: adminChangeReceipts.rows,
    policyVersions: policyVersions.rows,
    drReceipts: drReceipts.rows,
  };
}
