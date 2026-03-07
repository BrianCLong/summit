export interface MarketplaceToolRecord {
  source_id: string;
  marketplace: string;
  provider: string;
  tool_name: string;
  raw_claim_ids: string[];
}

export abstract class BaseMarketplaceAdapter {
  abstract fetchTools(): Promise<MarketplaceToolRecord[]>;
}
