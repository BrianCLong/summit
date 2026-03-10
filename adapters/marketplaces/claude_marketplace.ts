import { BaseMarketplaceAdapter, MarketplaceToolRecord } from './base';

export class ClaudeMarketplaceAdapter extends BaseMarketplaceAdapter {
  async fetchTools(): Promise<MarketplaceToolRecord[]> {
    return [
      {
        source_id: "claude-marketplace-gitlab",
        marketplace: "Claude Marketplace",
        provider: "GitLab",
        tool_name: "GitLab AI tools",
        raw_claim_ids: ["ITEM:CLAIM-02"]
      },
      {
        source_id: "claude-marketplace-replit",
        marketplace: "Claude Marketplace",
        provider: "Replit",
        tool_name: "Replit AI dev tools",
        raw_claim_ids: ["ITEM:CLAIM-02"]
      },
      {
        source_id: "claude-marketplace-snowflake",
        marketplace: "Claude Marketplace",
        provider: "Snowflake",
        tool_name: "Snowflake AI integration",
        raw_claim_ids: ["ITEM:CLAIM-02"]
      }
    ];
  }
}
