import { z } from 'zod';
import { getPostgresPool } from '../config/database.js';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { QuotaManager } from '../lib/resources/quota-manager.js';

// Input Validation Schema
export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  residency: z.enum(['US', 'EU']),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  residency: 'US' | 'EU';
  tier: string;
  status: string;
  config: Record<string, any>;
  settings: Record<string, any>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TenantService {
  private static instance: TenantService;

  private constructor() {}

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  /**
   * Create a new tenant with self-serve guardrails
   */
  async createTenant(input: CreateTenantInput, actorId: string): Promise<Tenant> {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Validate Input
      const validated = createTenantSchema.parse(input);

      // 2. Idempotency Check
      // If a tenant with the same slug exists, check if it was created by the same actor.
      // If so, return it (idempotency). If not, throw conflict.
      const existing = await client.query('SELECT * FROM tenants WHERE slug = $1', [validated.slug]);
      if (existing.rowCount && existing.rowCount > 0) {
        const existingTenant = this.mapRowToTenant(existing.rows[0]);
        if (existingTenant.createdBy === actorId) {
             logger.info(`Idempotent creation for tenant ${existingTenant.slug} by user ${actorId}`);
             await client.query('ROLLBACK');
             return existingTenant;
        }
        throw new Error(`Tenant slug '${validated.slug}' is already taken.`);
      }

      // 3. Define Defaults (Guardrails)
      const defaults = {
        tier: 'starter',
        status: 'active',
        config: {
          features: {
            sso: false,
            audit_logs: false,
          },
          security: {
            mfa_enforced: false,
          },
        },
        settings: {
          theme: 'light',
        },
      };

      // 4. Create Tenant in DB
      const tenantId = randomUUID();
      const insertQuery = `
        INSERT INTO tenants (
          id, name, slug, residency, tier, status, config, settings, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *
      `;

      const result = await client.query(insertQuery, [
        tenantId,
        validated.name,
        validated.slug,
        validated.residency,
        defaults.tier,
        defaults.status,
        defaults.config,
        defaults.settings,
        actorId
      ]);

      const tenant = this.mapRowToTenant(result.rows[0]);

      // 5. Initialize Quotas
      logger.info(`Initialized quotas for tenant ${tenantId} (Tier: starter)`);

      // 6. Record Audit Event
      await provenanceLedger.appendEntry({
         action: 'TENANT_CREATED',
         actor: {
             id: actorId || 'system',
             role: 'admin'
         },
         metadata: {
             tenantId: tenant.id,
             residency: tenant.residency,
             tier: tenant.tier
         },
         artifacts: []
      });

      // 7. Associate User with Tenant (Set as their active tenant and grant admin)
      // Assuming 'users' table has tenant_id.
      // Also assuming we want to move the user into this tenant.
      await client.query(
          'UPDATE users SET tenant_id = $1, role = $2 WHERE id = $3',
          [tenantId, 'ADMIN', actorId]
      );

      await client.query('COMMIT');
      logger.info(`Tenant created successfully: ${tenant.slug} (${tenant.id})`);

      return tenant;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create tenant:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(id: string): Promise<Tenant | null> {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;
    return this.mapRowToTenant(result.rows[0]);
  }

  /**
   * Get tenant by Slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]);

    if (result.rows.length === 0) return null;
    return this.mapRowToTenant(result.rows[0]);
  }

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      residency: row.residency,
      tier: row.tier,
      status: row.status,
      config: row.config,
      settings: row.settings,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const tenantService = TenantService.getInstance();
