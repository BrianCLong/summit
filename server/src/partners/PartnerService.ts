import {
  Partner,
  PartnerArchetype,
  PartnerMotion,
  PartnerTier,
  CreatePartnerInput,
  PartnerGovernancePolicy,
  PartnerStatus
} from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../db/postgres.js';

/**
 * PartnerService - Manages the lifecycle and strategy of partners.
 * Implements Epic 1: Partner Strategy & Channel Design.
 */
export class PartnerService {
  private static instance: PartnerService;
  private readonly db = getPostgresPool();

  // In-memory storage for strategy definitions
  private strategy = {
    archetypes: [
      'SI', 'MSP', 'Reseller', 'TechPartner', 'Marketplace', 'OEM'
    ] as PartnerArchetype[],
    priorityMotions: [
      'Co-Sell', 'Implement', 'Refer'
    ] as PartnerMotion[],
    tiers: ['Silver', 'Gold', 'Platinum'] as PartnerTier[],
    governancePolicy: {
      approvers: [
        { tier: 'Platinum', roles: ['CRO', 'CEO'] },
        { tier: 'Gold', roles: ['VP Sales', 'Channel Chief'] },
        { tier: 'Silver', roles: ['Partner Manager'] }
      ],
      signingAuthority: ['VP Sales', 'CRO'],
      requiredDocuments: ['MSA', 'NDA']
    } as PartnerGovernancePolicy
  };

  private constructor() {}

  public static getInstance(): PartnerService {
    if (!PartnerService.instance) {
      PartnerService.instance = new PartnerService();
    }
    return PartnerService.instance;
  }

  /**
   * Initialize/Seed Strategy Data
   * "Pick your partner archetypes", "Choose 3 priority partner motions"
   */
  public getStrategy() {
    return this.strategy;
  }

  /**
   * Create a new partner.
   * Enforces that archetypes and motions are valid per strategy.
   */
  public async createPartner(input: CreatePartnerInput, userRole?: string): Promise<Partner> {
    // Validate Archetype
    if (!this.strategy.archetypes.includes(input.archetype)) {
      throw new Error(`Invalid archetype: ${input.archetype}. Allowed: ${this.strategy.archetypes.join(', ')}`);
    }

    // Validate Motions
    input.motions.forEach(m => {
      if (!this.strategy.priorityMotions.includes(m)) {
        throw new Error(`Invalid motion: ${m}. Allowed: ${this.strategy.priorityMotions.join(', ')}`);
      }
    });

    // Validate Tier
    if (!this.strategy.tiers.includes(input.tier)) {
      throw new Error(`Invalid tier: ${input.tier}. Allowed: ${this.strategy.tiers.join(', ')}`);
    }

    // Governance Check: Validate if the user role can create a partner of this tier
    // "Implement governance: who can sign partners and under what terms."
    if (userRole) {
      const policy = this.strategy.governancePolicy.approvers.find(p => p.tier === input.tier);
      if (policy && !policy.roles.some(r => userRole.includes(r))) {
        // Enforce governance policy
        throw new Error(`User with role ${userRole} is not authorized to create ${input.tier} partners. Required: ${policy.roles.join(', ')}`);
      }
    }

    const partner: Partner = {
      id: uuidv4(),
      ...input,
      scorecard: {
        pipelineValue: 0,
        winRate: 0,
        implementationQuality: 0,
        churnInfluence: 0,
        lastUpdated: new Date()
      },
      targets: [],
      onboardingStatus: {
        trainingCompleted: false,
        certifications: [],
        supportReadiness: 'None'
      },
      legal: {
        msaSigned: false,
        referralAgreementSigned: false,
        resellerAgreementSigned: false,
        dataSharingAgreementSigned: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Persistence
    const query = `
      INSERT INTO partners (
        id, name, archetype, motions, tier, status,
        icp_alignment, scorecard, targets, channel_conflict_rules,
        onboarding_status, legal, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14
      ) RETURNING *
    `;
    const values = [
      partner.id, partner.name, partner.archetype, partner.motions, partner.tier, partner.status,
      JSON.stringify(partner.icpAlignment), JSON.stringify(partner.scorecard), JSON.stringify(partner.targets), JSON.stringify(partner.channelConflictRules),
      JSON.stringify(partner.onboardingStatus), JSON.stringify(partner.legal), partner.createdAt, partner.updatedAt
    ];

    await this.db.query(query, values);
    return partner;
  }

  public async getPartner(id: string): Promise<Partner | undefined> {
    const result = await this.db.query('SELECT * FROM partners WHERE id = $1', [id]);
    if (result.rowCount === 0) return undefined;
    return this.mapRowToPartner(result.rows[0]);
  }

  public async getAllPartners(): Promise<Partner[]> {
    const result = await this.db.query('SELECT * FROM partners');
    return result.rows.map(this.mapRowToPartner);
  }

  public async updatePartner(id: string, updates: Partial<Partner>): Promise<Partner> {
    const current = await this.getPartner(id);
    if (!current) {
      throw new Error(`Partner not found: ${id}`);
    }

    const updatedPartner = {
      ...current,
      ...updates,
      updatedAt: new Date()
    };

    // Build dynamic update query
    // Simplified for now: just update everything manageable or just specific fields
    // For prototype, re-saving the whole object structure is easiest if we don't need partial field patch for JSONB deep keys

    const query = `
      UPDATE partners SET
        name = $2,
        archetype = $3,
        motions = $4,
        tier = $5,
        status = $6,
        icp_alignment = $7,
        scorecard = $8,
        targets = $9,
        channel_conflict_rules = $10,
        onboarding_status = $11,
        legal = $12,
        updated_at = $13
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      updatedPartner.name,
      updatedPartner.archetype,
      updatedPartner.motions,
      updatedPartner.tier,
      updatedPartner.status,
      JSON.stringify(updatedPartner.icpAlignment),
      JSON.stringify(updatedPartner.scorecard),
      JSON.stringify(updatedPartner.targets),
      JSON.stringify(updatedPartner.channelConflictRules),
      JSON.stringify(updatedPartner.onboardingStatus),
      JSON.stringify(updatedPartner.legal),
      updatedPartner.updatedAt
    ];

    await this.db.query(query, values);
    return updatedPartner;
  }

  public async deletePartner(id: string): Promise<void> {
    await this.db.query('DELETE FROM partners WHERE id = $1', [id]);
  }

  /**
   * Sets annual partner targets and quarterly quotas
   */
  public async setPartnerTargets(partnerId: string, targets: any[]): Promise<Partner> {
    const partner = await this.getPartner(partnerId);
    if (!partner) throw new Error('Partner not found');

    const updatedTargets = targets;

    const query = `
        UPDATE partners SET targets = $2, updated_at = NOW() WHERE id = $1 RETURNING *
    `;
    const result = await this.db.query(query, [partnerId, JSON.stringify(updatedTargets)]);
    return this.mapRowToPartner(result.rows[0]);
  }

  // Testing helper
  public async _resetForTesting() {
    await this.db.query('DELETE FROM partners');
  }

  private mapRowToPartner(row: any): Partner {
    return {
      ...row,
      // Parse JSONB fields if the driver doesn't automatically (pg driver usually does for json/jsonb columns)
      // but explicitly verifying typing
      icpAlignment: typeof row.icp_alignment === 'string' ? JSON.parse(row.icp_alignment) : row.icp_alignment,
      scorecard: typeof row.scorecard === 'string' ? JSON.parse(row.scorecard) : row.scorecard,
      targets: typeof row.targets === 'string' ? JSON.parse(row.targets) : row.targets,
      channelConflictRules: typeof row.channel_conflict_rules === 'string' ? JSON.parse(row.channel_conflict_rules) : row.channel_conflict_rules,
      onboardingStatus: typeof row.onboarding_status === 'string' ? JSON.parse(row.onboarding_status) : row.onboarding_status,
      legal: typeof row.legal === 'string' ? JSON.parse(row.legal) : row.legal,
      // CamelCase conversion if needed (DB is snake_case)
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
