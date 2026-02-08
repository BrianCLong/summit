export interface OsintLicense {
  name: string;
  url?: string;
  permissions?: string[];
  limitations?: string[];
}

export interface OsintProvenance {
  source: string;
  method: 'scrape' | 'api' | 'manual' | 'purchase' | 'partner-export';
  confidence_score?: number;
  last_verified?: string;
}

export interface OsintPrivacy {
  has_pii: boolean;
  retention_policy?: 'transient' | 'standard' | 'restricted';
  audit_required?: boolean;
}

export interface OsintAsset {
  asset_id: string;
  name: string;
  description?: string;
  tags?: string[];
  license: OsintLicense;
  provenance: OsintProvenance;
  privacy: OsintPrivacy;
  shareability: 'public' | 'internal' | 'restricted';
  created_at: string;
  updated_at: string;
}

export interface CatalogQuery {
  tag?: string;
  license?: string;
  shareability?: string;
  has_pii?: boolean;
}
