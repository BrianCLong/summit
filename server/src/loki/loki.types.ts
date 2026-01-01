// server/src/loki/loki.types.ts

/**
 * Represents a deception campaign.
 */
export interface DeceptionCampaign {
  campaignId: string;
  objective: string;
}

/**
 * Represents a campaign result.
 */
export interface CampaignResult {
  resultId: string;
  objective: string;
  status: 'success' | 'failure';
}
