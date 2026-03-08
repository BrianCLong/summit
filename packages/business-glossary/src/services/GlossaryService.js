"use strict";
/**
 * Glossary Service
 * Manages business terms, categories, and taxonomy
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlossaryService = void 0;
const data_catalog_1 = require("@intelgraph/data-catalog");
class GlossaryService {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Create new glossary term
     */
    async createTerm(data) {
        const now = new Date();
        const term = {
            ...data,
            id: this.generateTermId(data.name),
            version: 1,
            versionHistory: [],
            createdAt: now,
            updatedAt: now,
            createdBy: data.owner,
            updatedBy: data.owner,
            status: data_catalog_1.TermStatus.DRAFT,
            approvalStatus: data_catalog_1.ApprovalStatus.PENDING,
            approvedBy: null,
            approvedAt: null,
            childTermIds: [],
            linkedAssets: [],
        };
        return this.store.createTerm(term);
    }
    /**
     * Update glossary term
     */
    async updateTerm(id, updates, updatedBy, changeNotes = '') {
        const existingTerm = await this.store.getTerm(id);
        if (!existingTerm) {
            throw new Error(`Term ${id} not found`);
        }
        // Create version history entry
        const versionEntry = {
            version: existingTerm.version,
            definition: existingTerm.definition,
            changedBy: updatedBy,
            changedAt: new Date(),
            changeNotes,
        };
        const updatedTerm = await this.store.updateTerm(id, {
            ...updates,
            version: existingTerm.version + 1,
            versionHistory: [...existingTerm.versionHistory, versionEntry],
            updatedAt: new Date(),
            updatedBy,
            approvalStatus: data_catalog_1.ApprovalStatus.PENDING, // Reset approval on changes
        });
        return updatedTerm;
    }
    /**
     * Delete glossary term
     */
    async deleteTerm(id) {
        await this.store.deleteTerm(id);
    }
    /**
     * Get term by ID
     */
    async getTerm(id) {
        return this.store.getTerm(id);
    }
    /**
     * Search terms
     */
    async searchTerms(query) {
        return this.store.searchTerms(query);
    }
    /**
     * Publish term
     */
    async publishTerm(id, publishedBy) {
        const term = await this.store.getTerm(id);
        if (!term) {
            throw new Error(`Term ${id} not found`);
        }
        if (term.approvalStatus !== data_catalog_1.ApprovalStatus.APPROVED) {
            throw new Error('Term must be approved before publishing');
        }
        return this.store.updateTerm(id, {
            status: data_catalog_1.TermStatus.PUBLISHED,
            updatedBy: publishedBy,
            updatedAt: new Date(),
        });
    }
    /**
     * Deprecate term
     */
    async deprecateTerm(id, reason, deprecatedBy) {
        return this.store.updateTerm(id, {
            status: data_catalog_1.TermStatus.DEPRECATED,
            updatedBy: deprecatedBy,
            updatedAt: new Date(),
        });
    }
    /**
     * Add synonym to term
     */
    async addSynonym(termId, synonym, updatedBy) {
        const term = await this.store.getTerm(termId);
        if (!term) {
            throw new Error(`Term ${termId} not found`);
        }
        const updatedSynonyms = Array.from(new Set([...term.synonyms, synonym]));
        return this.store.updateTerm(termId, {
            synonyms: updatedSynonyms,
            updatedBy,
            updatedAt: new Date(),
        });
    }
    /**
     * Add related term
     */
    async addRelatedTerm(termId, relatedTermId, updatedBy) {
        const term = await this.store.getTerm(termId);
        if (!term) {
            throw new Error(`Term ${termId} not found`);
        }
        const updatedRelatedTerms = Array.from(new Set([...term.relatedTerms, relatedTermId]));
        return this.store.updateTerm(termId, {
            relatedTerms: updatedRelatedTerms,
            updatedBy,
            updatedAt: new Date(),
        });
    }
    /**
     * Link term to asset
     */
    async linkToAsset(termId, assetId, linkedBy, confidence = 1.0, isAutoLinked = false) {
        const link = {
            termId,
            assetId,
            linkedBy,
            linkedAt: new Date(),
            confidence,
            isAutoLinked,
        };
        // Update term's linked assets
        const term = await this.store.getTerm(termId);
        if (term) {
            await this.store.updateTerm(termId, {
                linkedAssets: [...term.linkedAssets, assetId],
            });
        }
        return this.store.linkTermToAsset(link);
    }
    /**
     * Create category
     */
    async createCategory(data) {
        const category = {
            ...data,
            id: this.generateCategoryId(data.name),
            childCategoryIds: [],
            termCount: 0,
        };
        return this.store.createCategory(category);
    }
    /**
     * Get category
     */
    async getCategory(id) {
        return this.store.getCategory(id);
    }
    /**
     * Generate term ID
     */
    generateTermId(name) {
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `term-${sanitizedName}-${Date.now()}`;
    }
    /**
     * Generate category ID
     */
    generateCategoryId(name) {
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `cat-${sanitizedName}-${Date.now()}`;
    }
}
exports.GlossaryService = GlossaryService;
