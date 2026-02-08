
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

export type PartnerTier = 'VERIFIED' | 'TRUSTED_SOVEREIGN' | 'ELITE_COGNITIVE';
export type CertificationStatus = 'PENDING' | 'CERTIFIED' | 'REVOKED' | 'EXPIRED';

export interface PartnerCertification {
  partnerId: string;
  name: string;
  tier: PartnerTier;
  status: CertificationStatus;
  certifiedAt?: string;
  expiresAt?: string;
  metadata: Record<string, any>;
}

/**
 * Registry for Ecosystem Partnership Certification (Task #105).
 */
export class CertificationRegistry {
  private static instance: CertificationRegistry;

  private constructor() {}

  public static getInstance(): CertificationRegistry {
    if (!CertificationRegistry.instance) {
      CertificationRegistry.instance = new CertificationRegistry();
    }
    return CertificationRegistry.instance;
  }

  /**
   * Registers or updates a partner certification.
   */
  public async registerPartner(partner: PartnerCertification): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO partner_certifications (partner_id, name, tier, status, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (partner_id) DO UPDATE SET 
         status = $4, 
         metadata = $5, 
         updated_at = NOW()`,
      [partner.partnerId, partner.name, partner.tier, partner.status, JSON.stringify(partner.metadata)]
    );
    logger.info({ partnerId: partner.partnerId, status: partner.status }, 'Partner certification recorded');
  }

  /**
   * Checks if a partner is currently certified.
   */
  public async isCertified(partnerId: string): Promise<boolean> {
    const pool = getPostgresPool();
    const result = await pool.query(
      "SELECT status FROM partner_certifications WHERE partner_id = $1 AND status = 'CERTIFIED'",
      [partnerId]
    );
    return result.rows.length > 0;
  }
}

export const certificationRegistry = CertificationRegistry.getInstance();
