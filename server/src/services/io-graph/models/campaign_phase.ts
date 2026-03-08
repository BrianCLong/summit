/**
 * Represents a phase in an Influence Operation campaign.
 * Based on the Summit Influence Ops Phase Model v1.
 */

export enum CampaignPhaseName {
  SHAPING = 'Shaping',
  SEEDING = 'Seeding',
  AMPLIFICATION = 'Amplification',
  CONSOLIDATION = 'Consolidation',
  REACTIVATION = 'Reactivation',
}

export enum CampaignPhaseStatus {
  PLANNED = 'Planned',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  SUSPENDED = 'Suspended',
}

export interface CampaignPhase {
  phase_id: string;
  campaign_id: string;
  phase_name: CampaignPhaseName;
  description?: string;
  status: CampaignPhaseStatus;
  tactics?: string[];
  target_segments?: string[];
  vulnerabilities_targeted?: string[];
  start_date?: Date;
  end_date?: Date;
  metrics?: Record<string, number>;
  provenance_id?: string;
}

/**
 * Input type for creating or updating a campaign phase.
 */
export interface CampaignPhaseInput {
  campaign_id: string;
  phase_name: CampaignPhaseName;
  description?: string;
  status?: CampaignPhaseStatus;
  tactics?: string[];
  target_segments?: string[];
  vulnerabilities_targeted?: string[];
  start_date?: Date;
  end_date?: Date;
  metrics?: Record<string, number>;
  provenance_id?: string;
}
