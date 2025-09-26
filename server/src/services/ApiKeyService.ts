import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { getPostgresPool } from '../db/postgres.js';

export type ApiKeyScope = 'VIEWER' | 'ANALYST' | 'OPERATOR' | 'ADMIN';

export interface ApiKeyRecord {
  id: string;
  name: string;
  scope: ApiKeyScope;
  tenantId: string | null;
  createdBy: string | null;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  lastUsedAt: Date | null;
}

interface CreateApiKeyOptions {
  name: string;
  scope: ApiKeyScope;
  expiresAt: Date;
  createdBy: string | null;
  tenantId: string | null;
}

interface ListOptions {
  tenantId: string | null;
  includeRevoked?: boolean;
}

export default class ApiKeyService {
  private pool: Pool;

  constructor(pool: Pool = getPostgresPool()) {
    this.pool = pool;
  }

  async listKeys(options: ListOptions): Promise<ApiKeyRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.tenantId) {
      conditions.push(`tenant_id = $${params.length + 1}`);
      params.push(options.tenantId);
    }

    if (!options.includeRevoked) {
      conditions.push(`revoked_at IS NULL`);
      conditions.push(`expires_at > NOW()`);
    }

    let query =
      'SELECT id, name, scope, tenant_id, created_by, created_at, expires_at, revoked_at, revoked_by, last_used_at FROM api_keys';

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await this.pool.query(query, params);
    return rows.map((row) => this.mapRow(row));
  }

  async createKey(options: CreateApiKeyOptions): Promise<{ secret: string; apiKey: ApiKeyRecord }> {
    const id = uuidv4();
    const secret = this.generateSecret();
    const hash = this.hashSecret(secret);

    const { rows } = await this.pool.query(
      `INSERT INTO api_keys (id, name, key_hash, scope, tenant_id, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, scope, tenant_id, created_by, created_at, expires_at, revoked_at, revoked_by, last_used_at`,
      [id, options.name, hash, options.scope, options.tenantId, options.createdBy, options.expiresAt],
    );

    const apiKey = this.mapRow(rows[0]);
    return { secret, apiKey };
  }

  async revokeKey(id: string, revokedBy: string | null): Promise<ApiKeyRecord> {
    const { rows } = await this.pool.query(
      `UPDATE api_keys
       SET revoked_at = NOW(), revoked_by = $2
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id, name, scope, tenant_id, created_by, created_at, expires_at, revoked_at, revoked_by, last_used_at`,
      [id, revokedBy],
    );

    if (rows.length === 0) {
      throw new Error('API key not found or already revoked');
    }

    return this.mapRow(rows[0]);
  }

  async validateKey(rawKey: string): Promise<ApiKeyRecord | null> {
    const hash = this.hashSecret(rawKey);
    const { rows } = await this.pool.query(
      `SELECT id, name, scope, tenant_id, created_by, created_at, expires_at, revoked_at, revoked_by, last_used_at
       FROM api_keys
       WHERE key_hash = $1`,
      [hash],
    );

    if (rows.length === 0) {
      return null;
    }

    const record = this.mapRow(rows[0]);

    if (record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    await this.pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [record.id]);

    return record;
  }

  private generateSecret(): string {
    const token = randomBytes(32).toString('hex');
    return `sk_${token}`;
  }

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private mapRow(row: any): ApiKeyRecord {
    return {
      id: row.id,
      name: row.name,
      scope: row.scope,
      tenantId: row.tenant_id ?? null,
      createdBy: row.created_by ?? null,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      revokedBy: row.revoked_by ?? null,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    };
  }
}
