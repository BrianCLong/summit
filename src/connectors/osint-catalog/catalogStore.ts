import { OsintAsset, CatalogQuery } from './types.js';

export class CatalogStore {
  private assets: Map<string, OsintAsset> = new Map();

  constructor(initialAssets: OsintAsset[] = []) {
    initialAssets.forEach(a => this.assets.set(a.asset_id, a));
  }

  async addAsset(asset: OsintAsset): Promise<void> {
    if (this.assets.has(asset.asset_id)) {
      throw new Error(`Asset ${asset.asset_id} already exists`);
    }
    this.assets.set(asset.asset_id, asset);
  }

  async getAsset(assetId: string): Promise<OsintAsset | undefined> {
    return this.assets.get(assetId);
  }

  async searchAssets(query: CatalogQuery): Promise<OsintAsset[]> {
    return Array.from(this.assets.values()).filter(asset => {
      if (query.tag && !asset.tags?.includes(query.tag)) return false;
      if (query.license && asset.license.name !== query.license) return false;
      if (query.shareability && asset.shareability !== query.shareability) return false;
      if (query.has_pii !== undefined && asset.privacy.has_pii !== query.has_pii) return false;
      return true;
    });
  }

  async listAssets(): Promise<OsintAsset[]> {
    return Array.from(this.assets.values());
  }
}

// Singleton instance for demo purposes
export const catalogStore = new CatalogStore();
