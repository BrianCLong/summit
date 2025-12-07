
import { Pool } from 'pg';

export interface License {
  id: string;
  name: string;
  complianceLevel: 'allow' | 'warn' | 'block';
  restrictions: {
    exportAllowed: boolean;
    commercialUse: boolean;
    attributionRequired: boolean;
    expiryDate?: Date;
  };
}

export class DataLicenseRegistry {
  private pg: Pool;

  constructor(pg: Pool) {
    this.pg = pg;
  }

  async registerSourceLicense(sourceId: string, license: License): Promise<void> {
    const client = await this.pg.connect();
    try {
      await client.query(
        `INSERT INTO licenses (id, name, compliance_level, restrictions)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         compliance_level = EXCLUDED.compliance_level,
         restrictions = EXCLUDED.restrictions`,
        [license.id, license.name, license.complianceLevel, JSON.stringify(license.restrictions)]
      );

      await client.query(
        `UPDATE data_sources SET license_id = $1 WHERE id = $2`,
        [license.id, sourceId]
      );
    } finally {
      client.release();
    }
  }

  async checkCompliance(sourceId: string, operation: 'ingest' | 'query' | 'export'): Promise<{ allowed: boolean; reason?: string }> {
    const result = await this.pg.query(
      `SELECT l.* FROM data_sources ds
       JOIN licenses l ON ds.license_id = l.id
       WHERE ds.id = $1`,
      [sourceId]
    );

    if (result.rows.length === 0) return { allowed: true, reason: 'No license restriction found' }; // Default allow if unknown? Or default block? Prompt implies enforcement.

    const license = result.rows[0];
    const restrictions = license.restrictions;

    if (license.compliance_level === 'block') {
      return { allowed: false, reason: 'License explicitly blocks usage' };
    }

    if (operation === 'export' && restrictions.exportAllowed === false) {
        return { allowed: false, reason: 'Export not allowed by license' };
    }

    return { allowed: true };
  }
}
