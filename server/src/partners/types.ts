/**
 * Partner Strategy & Channel Design Types
 * Epic 1: Partner Strategy & Channel Design
 */

/**
 * Partner Archetypes - The categories of partners we work with.
 * "Pick your partner archetypes: SIs, MSPs, resellers, tech partners, marketplaces, OEMs."
 */
export type PartnerArchetype =
  | 'SI'            // System Integrators
  | 'MSP'           // Managed Service Providers
  | 'Reseller'      // Value Added Resellers
  | 'TechPartner'   // Technology/ISV Partners
  | 'Marketplace'   // Cloud Marketplaces (AWS, Azure, GCP)
  | 'OEM';          // Original Equipment Manufacturers

/**
 * Partner Motions - The ways we go to market with partners.
 * "Choose 3 priority partner motions (co-sell, implement, refer) and drop the rest."
 */
export type PartnerMotion =
  | 'Co-Sell'       // Joint selling with partner
  | 'Implement'     // Partner implements the solution
  | 'Refer';        // Partner refers leads

/**
 * Partner Tiers - The hierarchy of partner relationships.
 * "Create a partner tiering model with clear requirements and benefits."
 */
export type PartnerTier = 'Silver' | 'Gold' | 'Platinum';

/**
 * Partner Status
 */
export type PartnerStatus = 'Active' | 'Onboarding' | 'Inactive' | 'Suspended';

/**
 * Partner Scorecard - Metrics for evaluating partner performance.
 * "Build a partner scorecard: pipeline, win rate, implementation quality, churn influence."
 */
export interface PartnerScorecard {
  pipelineValue: number;      // Total value of pipeline generated/influenced
  winRate: number;            // Win rate for deals involving this partner
  implementationQuality: number; // 0-100 score based on implementation success
  churnInfluence: number;     // Churn rate of customers associated with this partner
  lastUpdated: Date;
}

/**
 * Partner Targets - Goals set for partners.
 * "Set annual partner targets and quarterly quotas (by archetype)."
 */
export interface PartnerTarget {
  year: number;
  quarter?: 1 | 2 | 3 | 4;
  metric: 'Revenue' | 'Leads' | 'Certifications';
  targetValue: number;
  actualValue: number;
}

/**
 * Partner Entity
 */
export interface Partner {
  id: string;
  name: string;
  archetype: PartnerArchetype;
  motions: PartnerMotion[]; // Can have multiple motions (e.g., Co-Sell AND Implement)
  tier: PartnerTier;
  status: PartnerStatus;

  // "Define partner ICP alignment and 'why they win when we win.'"
  icpAlignment: {
    industries: string[];
    regions: string[];
    companySize: string[];
    valueProposition: string; // "Why they win when we win"
  };

  scorecard: PartnerScorecard;
  targets: PartnerTarget[];

  // "Define channel conflict rules and escalation (who owns the customer when)."
  channelConflictRules: {
    dealRegistrationExpiryDays: number;
    exclusivityPeriodDays: number;
    escalationContact: string;
  };

  // "Define partner onboarding requirements (training, certification, support readiness)."
  onboardingStatus: {
    trainingCompleted: boolean;
    certifications: string[];
    supportReadiness: 'None' | 'Level1' | 'Level2';
    completedAt?: Date;
  };

  // "Build a partner legal template set (MSA, referral, reseller, data sharing)."
  legal: {
    msaSigned: boolean;
    referralAgreementSigned: boolean;
    resellerAgreementSigned: boolean;
    dataSharingAgreementSigned: boolean;
    signedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Partner Governance Configuration
 * "Implement governance: who can sign partners and under what terms."
 */
export interface PartnerGovernancePolicy {
  approvers: {
    tier: PartnerTier;
    roles: string[]; // e.g., ['VP Sales', 'CRO']
  }[];
  signingAuthority: string[];
  requiredDocuments: string[];
}

// Input types for creation
export type CreatePartnerInput = Omit<Partner, 'id' | 'createdAt' | 'updatedAt' | 'scorecard' | 'targets' | 'onboardingStatus' | 'legal'>;
