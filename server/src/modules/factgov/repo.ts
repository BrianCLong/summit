import { getPostgresPool } from '../../config/database.js';
import { Agency, Vendor, Validator, RFP, Match, Audit } from './types.js';

const pool = getPostgresPool();

export const factGovRepo = {
  async createAgency(name: string, domain: string): Promise<Agency> {
    const res = await pool.query(
      'INSERT INTO factgov_agencies (name, domain) VALUES ($1, $2) RETURNING *',
      [name, domain]
    );
    return camelCaseKeys(res.rows[0]);
  },

  async createVendor(name: string, tags: string[], description?: string): Promise<Vendor> {
    const res = await pool.query(
      'INSERT INTO factgov_vendors (name, tags, description) VALUES ($1, $2, $3) RETURNING *',
      [name, tags, description]
    );
    return camelCaseKeys(res.rows[0]);
  },

  async getVendor(id: string): Promise<Vendor | null> {
    const res = await pool.query('SELECT * FROM factgov_vendors WHERE id = $1', [id]);
    return res.rows.length ? camelCaseKeys(res.rows[0]) : null;
  },

  async findVendorsByTags(tags: string[]): Promise<Vendor[]> {
    const res = await pool.query('SELECT * FROM factgov_vendors WHERE tags && $1', [tags]);
    return res.rows.map(camelCaseKeys);
  },

  async createRfp(agencyId: string, title: string, content: string): Promise<RFP> {
    const res = await pool.query(
      'INSERT INTO factgov_rfps (agency_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [agencyId, title, content]
    );
    return camelCaseKeys(res.rows[0]);
  },

  async getRfp(id: string): Promise<RFP | null> {
    const res = await pool.query('SELECT * FROM factgov_rfps WHERE id = $1', [id]);
    return res.rows.length ? camelCaseKeys(res.rows[0]) : null;
  },

  async createMatch(rfpId: string, vendorId: string, score: number): Promise<Match> {
    const res = await pool.query(
        'INSERT INTO factgov_matches (rfp_id, vendor_id, score) VALUES ($1, $2, $3) RETURNING *',
        [rfpId, vendorId, score]
    );
    return camelCaseKeys(res.rows[0]);
  },

  async getMatchesForRfp(rfpId: string): Promise<Match[]> {
      const res = await pool.query('SELECT * FROM factgov_matches WHERE rfp_id = $1 ORDER BY score DESC', [rfpId]);
      return res.rows.map(camelCaseKeys);
  },

  async createAudit(audit: Omit<Audit, 'id' | 'createdAt'>): Promise<Audit> {
      const res = await pool.query(
          `INSERT INTO factgov_audits (entity_type, entity_id, action, actor_id, details, previous_hash, hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
           [audit.entityType, audit.entityId, audit.action, audit.actorId, JSON.stringify(audit.details), audit.previousHash, audit.hash]
      );
      return camelCaseKeys(res.rows[0]);
  },

  async getLatestAudit(entityId: string): Promise<Audit | null> {
      const res = await pool.query(
          'SELECT * FROM factgov_audits WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 1',
          [entityId]
      );
      return res.rows.length ? camelCaseKeys(res.rows[0]) : null;
  }
};

function camelCaseKeys(obj: any): any {
    const newObj: any = {};
    for (const key in obj) {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newObj[newKey] = obj[key];
    }
    return newObj;
}
