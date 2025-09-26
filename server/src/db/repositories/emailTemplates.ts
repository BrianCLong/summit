import { getPostgresPool } from '../postgres';
import baseLogger from '../../config/logger';
import {
  EmailBranding,
  EmailTemplateInput,
  EmailTemplateRecord,
} from '../../services/emailTemplates/types';

const logger = baseLogger.child({ name: 'email-templates-repo' });

let tableEnsured = false;

function normalizeBranding(branding?: EmailBranding | null): EmailBranding {
  if (!branding) {
    return {};
  }

  const cleaned: EmailBranding = {};

  if (branding.companyName !== undefined) cleaned.companyName = branding.companyName;
  if (branding.logoUrl !== undefined) cleaned.logoUrl = branding.logoUrl;
  if (branding.primaryColor !== undefined) cleaned.primaryColor = branding.primaryColor;
  if (branding.accentColor !== undefined) cleaned.accentColor = branding.accentColor;
  if (branding.supportEmail !== undefined) cleaned.supportEmail = branding.supportEmail;
  if (branding.footerText !== undefined) cleaned.footerText = branding.footerText;

  return cleaned;
}

async function ensureTable(): Promise<void> {
  if (tableEnsured) {
    return;
  }

  const pool = getPostgresPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        template_key TEXT NOT NULL,
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        description TEXT,
        branding JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, template_key)
      );
    `);
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_tenant_key ON email_templates(tenant_id, template_key);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_email_templates_updated_at ON email_templates(updated_at DESC);`,
    );
    tableEnsured = true;
  } catch (error) {
    logger.warn({ err: error }, 'failed to ensure email_templates table');
    throw error;
  }
}

function mapRow(row: any): EmailTemplateRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    key: row.template_key,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    description: row.description ?? null,
    branding: (row.branding as EmailBranding) ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const emailTemplateRepository = {
  async upsert(tenantId: string, input: EmailTemplateInput): Promise<EmailTemplateRecord> {
    await ensureTable();
    const pool = getPostgresPool();
    const branding = normalizeBranding(input.branding);

    const result = await pool.query(
      `
        INSERT INTO email_templates (
          tenant_id,
          template_key,
          subject_template,
          body_template,
          description,
          branding
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        ON CONFLICT (tenant_id, template_key)
        DO UPDATE SET
          subject_template = EXCLUDED.subject_template,
          body_template = EXCLUDED.body_template,
          description = EXCLUDED.description,
          branding = EXCLUDED.branding,
          updated_at = NOW()
        RETURNING id, tenant_id, template_key, subject_template, body_template, description, branding, created_at, updated_at;
      `,
      [tenantId, input.key, input.subjectTemplate, input.bodyTemplate, input.description ?? null, branding],
    );

    return mapRow(result.rows[0]);
  },

  async findByKey(tenantId: string, key: string): Promise<EmailTemplateRecord | null> {
    await ensureTable();
    const pool = getPostgresPool();
    const result = await pool.query(
      `SELECT id, tenant_id, template_key, subject_template, body_template, description, branding, created_at, updated_at
       FROM email_templates
       WHERE tenant_id = $1 AND template_key = $2`,
      [tenantId, key],
    );

    if (!result.rows.length) {
      return null;
    }

    return mapRow(result.rows[0]);
  },

  async list(tenantId: string, key?: string): Promise<EmailTemplateRecord[]> {
    await ensureTable();
    const pool = getPostgresPool();
    const params: any[] = [tenantId];
    let query = `SELECT id, tenant_id, template_key, subject_template, body_template, description, branding, created_at, updated_at
                 FROM email_templates
                 WHERE tenant_id = $1`;

    if (key) {
      params.push(key);
      query += ' AND template_key = $2';
    }

    query += ' ORDER BY template_key ASC, updated_at DESC';

    const result = await pool.query(query, params);
    return result.rows.map(mapRow);
  },

  async delete(tenantId: string, key: string): Promise<boolean> {
    await ensureTable();
    const pool = getPostgresPool();
    const result = await pool.query(
      `DELETE FROM email_templates WHERE tenant_id = $1 AND template_key = $2`,
      [tenantId, key],
    );

    return result.rowCount > 0;
  },
};

export type EmailTemplateRepository = typeof emailTemplateRepository;
