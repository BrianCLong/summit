"use strict";
/**
 * Catalog Service
 * Core service for managing data catalog assets
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogService = void 0;
const catalog_js_1 = require("../types/catalog.js");
class CatalogService {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Get asset by ID
     */
    async getAsset(id) {
        return this.store.getAsset(id);
    }
    /**
     * Create new asset
     */
    async createAsset(asset) {
        const now = new Date();
        const newAsset = {
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
    async updateAsset(id, updates) {
        const updatedAsset = await this.store.updateAsset(id, {
            ...updates,
            updatedAt: new Date(),
        });
        return updatedAsset;
    }
    /**
     * Delete asset
     */
    async deleteAsset(id) {
        await this.store.deleteAsset(id);
    }
    /**
     * Search assets
     */
    async searchAssets(request) {
        return this.store.searchAssets(request);
    }
    /**
     * List assets by type and status
     */
    async listAssets(type, status) {
        return this.store.listAssets(type, status);
    }
    /**
     * Get asset relationships
     */
    async getRelationships(assetId) {
        return this.store.getRelationships(assetId);
    }
    /**
     * Create relationship between assets
     */
    async createRelationship(fromAssetId, toAssetId, type, metadata = {}) {
        const relationship = {
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
    async getRelatedAssets(assetId, relationshipType) {
        const relationships = await this.store.getRelationships(assetId);
        const filteredRelationships = relationshipType
            ? relationships.filter((r) => r.relationshipType === relationshipType)
            : relationships;
        const relatedAssetIds = filteredRelationships.map((r) => r.fromAssetId === assetId ? r.toAssetId : r.fromAssetId);
        const relatedAssets = await Promise.all(relatedAssetIds.map((id) => this.store.getAsset(id)));
        return relatedAssets.filter((asset) => asset !== null);
    }
    /**
     * Update asset access time
     */
    async recordAccess(assetId, userId) {
        await this.store.updateAsset(assetId, {
            lastAccessedAt: new Date(),
        });
    }
    /**
     * Add tags to asset
     */
    async addTags(assetId, tags) {
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
    async removeTags(assetId, tags) {
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
    async updateOwner(assetId, newOwner) {
        return this.store.updateAsset(assetId, { owner: newOwner });
    }
    /**
     * Add stewards to asset
     */
    async addStewards(assetId, stewards) {
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
    async deprecateAsset(assetId, reason) {
        return this.store.updateAsset(assetId, {
            status: catalog_js_1.AssetStatus.DEPRECATED,
            properties: {
                deprecationReason: reason,
                deprecatedAt: new Date().toISOString(),
            },
        });
    }
    /**
     * Archive asset
     */
    async archiveAsset(assetId) {
        return this.store.updateAsset(assetId, {
            status: catalog_js_1.AssetStatus.ARCHIVED,
        });
    }
    /**
     * Generate asset ID
     */
    generateAssetId(type, name) {
        const timestamp = Date.now();
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${type.toLowerCase()}-${sanitizedName}-${timestamp}`;
    }
    /**
     * Generate relationship ID
     */
    generateRelationshipId(fromId, toId, type) {
        const timestamp = Date.now();
        return `rel-${fromId}-${toId}-${type.toLowerCase()}-${timestamp}`;
    }
}
exports.CatalogService = CatalogService;
