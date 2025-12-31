
import { pool } from '../../db/pg.js';
import { Attestation } from '../types.js';

export class AttestationRepository {
  private static instance: AttestationRepository;

  private constructor() {}

  public static getInstance(): AttestationRepository {
    if (!AttestationRepository.instance) {
      AttestationRepository.instance = new AttestationRepository();
    }
    return AttestationRepository.instance;
  }

  async createTableIfNotExists() {
    // In a real scenario, this is a migration file.
    // For this task, we ensure table exists to support the "plumbing".
    const query = `
      CREATE TABLE IF NOT EXISTS attestations (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        data JSONB NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        revocation_reason TEXT,
        revocation_timestamp TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_attestations_tenant_id ON attestations(tenant_id);
    `;
    await pool.query(query);
  }

  async save(attestation: Attestation): Promise<void> {
    const query = `
      INSERT INTO attestations (id, tenant_id, timestamp, data)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [
      attestation.id,
      attestation.tenantId,
      attestation.timestamp,
      JSON.stringify(attestation)
    ]);
  }

  async getById(id: string): Promise<Attestation | null> {
    const query = `SELECT data FROM attestations WHERE id = $1`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0].data;
  }

  async listByTenant(tenantId: string): Promise<Attestation[]> {
    const query = `
      SELECT data FROM attestations
      WHERE tenant_id = $1
      ORDER BY timestamp DESC
    `;
    const result = await pool.query(query, [tenantId]);
    return result.rows.map(row => row.data);
  }

  async isRevoked(id: string): Promise<boolean> {
    const query = `SELECT revoked FROM attestations WHERE id = $1`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return false; // Unknown attestation is not "revoked" in DB sense, but verification might fail elsewhere
    return result.rows[0].revoked;
  }

  async revoke(id: string, reason: string): Promise<void> {
    const query = `
      UPDATE attestations
      SET revoked = TRUE, revocation_reason = $2, revocation_timestamp = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id, reason]);
  }
}
