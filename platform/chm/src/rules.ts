import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { ChmConfig } from './config.js';
import { emitEvent } from './events.js';
import { ClassificationCode, normalizeCode } from './taxonomy.js';

export interface DocumentRecord {
  id: string;
  title: string;
  classificationCode: ClassificationCode;
  residency: string;
  license: string;
  derivedFrom: boolean;
}

export interface RuleDecision {
  allowed: boolean;
  reason: string;
}

export const getDocument = async (pool: Pool, documentId: string): Promise<DocumentRecord | undefined> => {
  const result = await pool.query(
    `SELECT id, title, classification_code, residency, license, derived_from FROM documents WHERE id = $1`,
    [documentId]
  );
  if (!result.rowCount) {
    return undefined;
  }
  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    classificationCode: normalizeCode(result.rows[0].classification_code),
    residency: result.rows[0].residency,
    license: result.rows[0].license,
    derivedFrom: result.rows[0].derived_from
  };
};

export const evaluateView = (doc: DocumentRecord): RuleDecision => {
  if (doc.derivedFrom) {
    return { allowed: true, reason: 'View permitted with derived-from awareness' };
  }
  return { allowed: true, reason: 'View permitted' };
};

export const evaluateHandle = (doc: DocumentRecord): RuleDecision => {
  if (doc.classificationCode === 'TS') {
    return { allowed: false, reason: 'Handling requires privileged channel' };
  }
  return { allowed: true, reason: 'Handling permitted under standard controls' };
};

export const createDocument = async (pool: Pool, doc: DocumentRecord, actor: string): Promise<void> => {
  await pool.query(
    `INSERT INTO documents (id, title, classification_code, residency, license, derived_from)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, classification_code = excluded.classification_code,
     residency = excluded.residency, license = excluded.license, derived_from = excluded.derived_from, updated_at = NOW()`,
    [doc.id, doc.title, doc.classificationCode, doc.residency, doc.license, doc.derivedFrom]
  );

  emitEvent('chm.tag.applied', {
    documentId: doc.id,
    actor,
    details: { classification: doc.classificationCode }
  });

  await pool.query(
    `INSERT INTO audit_receipts (id, document_id, action, actor, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), doc.id, 'tag_applied', actor, { classification: doc.classificationCode }]
  );
};

export const residencyLicenseCheck = (
  doc: DocumentRecord,
  config: ChmConfig
): RuleDecision => {
  if (!config.residencyAllowList.includes(doc.residency)) {
    emitEvent('chm.tag.violated', {
      documentId: doc.id,
      actor: 'system',
      details: { reason: 'residency_block', residency: doc.residency }
    });
    return { allowed: false, reason: 'Export blocked: residency restriction' };
  }

  if (!config.licenseAllowList.includes(doc.license)) {
    emitEvent('chm.tag.violated', {
      documentId: doc.id,
      actor: 'system',
      details: { reason: 'license_block', license: doc.license }
    });
    return { allowed: false, reason: 'Export blocked: license restriction' };
  }

  return { allowed: true, reason: 'Export permitted' };
};

export const evaluateExport = async (
  pool: Pool,
  documentId: string,
  config: ChmConfig
): Promise<RuleDecision> => {
  const doc = await getDocument(pool, documentId);
  if (!doc) {
    return { allowed: false, reason: 'Document not found' };
  }

  if (doc.classificationCode === 'TS' || doc.classificationCode === 'S') {
    emitEvent('chm.tag.violated', {
      documentId: doc.id,
      actor: 'system',
      details: { reason: 'classification_block', classification: doc.classificationCode }
    });
    await pool.query(
      `INSERT INTO audit_receipts (id, document_id, action, actor, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), doc.id, 'export_blocked', 'system', { reason: 'Classification too high' }]
    );
    return { allowed: false, reason: 'Export blocked: downgrade required' };
  }

  const residencyDecision = residencyLicenseCheck(doc, config);
  if (!residencyDecision.allowed) {
    await pool.query(
      `INSERT INTO audit_receipts (id, document_id, action, actor, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), doc.id, 'export_blocked', 'system', { reason: residencyDecision.reason }]
    );
    return residencyDecision;
  }

  await pool.query(
    `INSERT INTO audit_receipts (id, document_id, action, actor, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), doc.id, 'export_allowed', 'system', { classification: doc.classificationCode }]
  );
  return { allowed: true, reason: 'Export permitted' };
};
