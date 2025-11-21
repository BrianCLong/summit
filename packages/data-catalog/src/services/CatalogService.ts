/**
 * Catalog Service
 * Core service for managing data catalog assets
 */

import {
  AssetMetadata,
  AssetType,
  AssetStatus,
  SearchRequest,
  SearchResponse,
  AssetRelationship,
  RelationshipType,
} from '../types/catalog.js';

export interface ICatalogStore {
  getAsset(id: string): Promise<AssetMetadata | null>;
  createAsset(asset: AssetMetadata): Promise<AssetMetadata>;
  updateAsset(id: string, asset: Partial<AssetMetadata>): Promise<AssetMetadata>;
  deleteAsset(id: string): Promise<void>;
  searchAssets(request: SearchRequest): Promise<SearchResponse>;
  listAssets(type?: AssetType, status?: AssetStatus): Promise<AssetMetadata[]>;
  getRelationships(assetId: string): Promise<AssetRelationship[]>;
  createRelationship(relationship: AssetRelationship): Promise<AssetRelationship>;
}

export class CatalogService {
  constructor(private store: ICatalogStore) {}

  /**
   * Get asset by ID
   */
  async getAsset(id: string): Promise<AssetMetadata | null> {
    return this.store.getAsset(id);
  }

  /**
   * Create new asset
   */
  async createAsset(asset: Omit<AssetMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetMetadata> {
    const now = new Date();
    const newAsset: AssetMetadata = {
      ...asset,
      id: this.generateAssetId(asset.type, asset.name),
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: null,
    };

    return this.store.createAsset(newAsset);
  }

  /**
   * Update asset
   */
  async updateAsset(id: string, updates: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const updatedAsset = await this.store.updateAsset(id, {
      ...updates,
      updatedAt: new Date(),
    });

    return updatedAsset;
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<void> {
    await this.store.deleteAsset(id);
  }

  /**
   * Search assets
   */
  async searchAssets(request: SearchRequest): Promise<SearchResponse> {
    return this.store.searchAssets(request);
  }

  /**
   * List assets by type and status
   */
  async listAssets(type?: AssetType, status?: AssetStatus): Promise<AssetMetadata[]> {
    return this.store.listAssets(type, status);
  }

  /**
   * Get asset relationships
   */
  async getRelationships(assetId: string): Promise<AssetRelationship[]> {
    return this.store.getRelationships(assetId);
  }

  /**
   * Create relationship between assets
   */
  async createRelationship(
    fromAssetId: string,
    toAssetId: string,
    type: RelationshipType,
    metadata: Record<string, any> = {}
  ): Promise<AssetRelationship> {
    const relationship: AssetRelationship = {
      id: this.generateRelationshipId(fromAssetId, toAssetId, type),
      fromAssetId,
      toAssetId,
      relationshipType: type,
      metadata,
      createdAt: new Date(),
    };

    return this.store.createRelationship(relationship);
  }

  /**
   * Get related assets
   */
  async getRelatedAssets(assetId: string, relationshipType?: RelationshipType): Promise<AssetMetadata[]> {
    const relationships = await this.store.getRelationships(assetId);
    const filteredRelationships = relationshipType
      ? relationships.filter((r) => r.relationshipType === relationshipType)
      : relationships;

    const relatedAssetIds = filteredRelationships.map((r) =>
      r.fromAssetId === assetId ? r.toAssetId : r.fromAssetId
    );

    const relatedAssets = await Promise.all(
      relatedAssetIds.map((id) => this.store.getAsset(id))
    );

    return relatedAssets.filter((asset): asset is AssetMetadata => asset !== null);
  }

  /**
   * Update asset access time
   */
  async recordAccess(assetId: string, userId: string): Promise<void> {
    await this.store.updateAsset(assetId, {
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Add tags to asset
   */
  async addTags(assetId: string, tags: string[]): Promise<AssetMetadata> {
    const asset = await this.store.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const updatedTags = Array.from(new Set([...asset.tags, ...tags]));
    return this.store.updateAsset(assetId, { tags: updatedTags });
  }

  /**
   * Remove tags from asset
   */
  async removeTags(assetId: string, tags: string[]): Promise<AssetMetadata> {
    const asset = await this.store.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const updatedTags = asset.tags.filter((tag) => !tags.includes(tag));
    return this.store.updateAsset(assetId, { tags: updatedTags });
  }

  /**
   * Update asset owner
   */
  async updateOwner(assetId: string, newOwner: string): Promise<AssetMetadata> {
    return this.store.updateAsset(assetId, { owner: newOwner });
  }

  /**
   * Add stewards to asset
   */
  async addStewards(assetId: string, stewards: string[]): Promise<AssetMetadata> {
    const asset = await this.store.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const updatedStewards = Array.from(new Set([...asset.stewards, ...stewards]));
    return this.store.updateAsset(assetId, { stewards: updatedStewards });
  }

  /**
   * Deprecate asset
   */
  async deprecateAsset(assetId: string, reason: string): Promise<AssetMetadata> {
    return this.store.updateAsset(assetId, {
      status: AssetStatus.DEPRECATED,
      properties: {
        deprecationReason: reason,
        deprecatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Archive asset
   */
  async archiveAsset(assetId: string): Promise<AssetMetadata> {
    return this.store.updateAsset(assetId, {
      status: AssetStatus.ARCHIVED,
    });
  }

  /**
   * Generate asset ID
   */
  private generateAssetId(type: AssetType, name: string): string {
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${type.toLowerCase()}-${sanitizedName}-${timestamp}`;
  }

  /**
   * Generate relationship ID
   */
  private generateRelationshipId(fromId: string, toId: string, type: RelationshipType): string {
    const timestamp = Date.now();
    return `rel-${fromId}-${toId}-${type.toLowerCase()}-${timestamp}`;
  }
}
