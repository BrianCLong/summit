import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';

export interface MCPServerRecord {
  id: string;
  name: string;
  url: string;
  auth_token?: string | null;
  scopes: string[];
  tags: string[];
  fingerprint_sha256?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMCPServerInput {
  name: string;
  url: string;
  authToken?: string;
  scopes?: string[];
  tags?: string[];
  fingerprintSha256?: string;
}

export interface UpdateMCPServerInput {
  name?: string;
  url?: string;
  authToken?: string | null; // allow explicit null to clear
  scopes?: string[];
  tags?: string[];
  fingerprintSha256?: string | null;
}

export class MCPServersRepo {
  private pool: Pool;
  private initialized = false;

  constructor() {
    this.pool = getPostgresPool();
  }

  private async ensureTable() {
    if (this.initialized) return;
    const sql = `
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        auth_token TEXT,
        scopes TEXT[] NOT NULL DEFAULT '{}',
        tags TEXT[] NOT NULL DEFAULT '{}',
        fingerprint_sha256 TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name);
    `;
    await this.pool.query(sql);
    this.initialized = true;
  }

  public async create(input: CreateMCPServerInput): Promise<MCPServerRecord> {
    await this.ensureTable();
    const { name, url, authToken, scopes = [], tags = [] } = input;
    const { rows } = await this.pool.query(
      `INSERT INTO mcp_servers (name, url, auth_token, scopes, tags, fingerprint_sha256)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, url, auth_token, scopes, tags, fingerprint_sha256, created_at, updated_at`,
      [
        name,
        url,
        authToken ?? null,
        scopes,
        tags,
        input.fingerprintSha256 ?? null,
      ],
    );
    return rows[0];
  }

  public async list(): Promise<MCPServerRecord[]> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, name, url, auth_token, scopes, tags, fingerprint_sha256, created_at, updated_at
       FROM mcp_servers ORDER BY created_at DESC`,
    );
    return rows;
  }

  public async get(id: string): Promise<MCPServerRecord | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, name, url, auth_token, scopes, tags, fingerprint_sha256, created_at, updated_at
       FROM mcp_servers WHERE id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  public async update(
    id: string,
    input: UpdateMCPServerInput,
  ): Promise<MCPServerRecord | null> {
    await this.ensureTable();
    // Build dynamic update
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (input.name !== undefined) {
      sets.push(`name = $${i++}`);
      vals.push(input.name);
    }
    if (input.url !== undefined) {
      sets.push(`url = $${i++}`);
      vals.push(input.url);
    }
    if (input.authToken !== undefined) {
      sets.push(`auth_token = $${i++}`);
      vals.push(input.authToken);
    }
    if (input.scopes !== undefined) {
      sets.push(`scopes = $${i++}`);
      vals.push(input.scopes);
    }
    if (input.tags !== undefined) {
      sets.push(`tags = $${i++}`);
      vals.push(input.tags);
    }
    if (input.fingerprintSha256 !== undefined) {
      sets.push(`fingerprint_sha256 = $${i++}`);
      vals.push(input.fingerprintSha256);
    }
    sets.push(`updated_at = CURRENT_TIMESTAMP`);

    if (sets.length === 1) {
      // only updated_at -> nothing to update
      const current = await this.get(id);
      return current;
    }

    const sql = `UPDATE mcp_servers SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, name, url, auth_token, scopes, tags, fingerprint_sha256, created_at, updated_at`;
    vals.push(id);
    const { rows } = await this.pool.query(sql, vals);
    return rows[0] || null;
  }

  public async delete(id: string): Promise<boolean> {
    await this.ensureTable();
    const { rowCount } = await this.pool.query(
      `DELETE FROM mcp_servers WHERE id = $1`,
      [id],
    );
    return rowCount > 0;
  }
}

let _mcpServersRepo: MCPServersRepo | null = null;

export const mcpServersRepo = {
  get instance(): MCPServersRepo {
    if (!_mcpServersRepo) {
      _mcpServersRepo = new MCPServersRepo();
    }
    return _mcpServersRepo;
  },

  // Proxy methods for backward compatibility
  get: (id: string) => mcpServersRepo.instance.get(id),
  list: () => mcpServersRepo.instance.list(),
  create: (server: Omit<MCPServerRecord, 'id' | 'created_at' | 'updated_at'>) =>
    mcpServersRepo.instance.create(server),
  update: (
    id: string,
    server: Partial<Omit<MCPServerRecord, 'id' | 'created_at' | 'updated_at'>>,
  ) => mcpServersRepo.instance.update(id, server),
  delete: (id: string) => mcpServersRepo.instance.delete(id),
};
