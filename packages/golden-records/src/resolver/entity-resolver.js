"use strict";
/**
 * Entity Resolver
 * Resolves and links entities across different systems and data sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolver = void 0;
const mdm_core_1 = require("@intelgraph/mdm-core");
const uuid_1 = require("uuid");
class EntityResolver {
    matchingEngine;
    config;
    links;
    constructor(config) {
        this.config = config;
        this.matchingEngine = new mdm_core_1.MatchingEngine();
        this.links = new Map();
    }
    /**
     * Resolve entities within a dataset
     */
    async resolveEntities(entities) {
        const matches = await this.matchingEngine.findMatches(entities, this.config.matchingConfig);
        const links = [];
        let autoLinked = 0;
        let manualReviewRequired = 0;
        for (const match of matches) {
            const link = this.createLink(match);
            if (match.matchScore >= this.config.autoLinkThreshold) {
                link.status = 'approved';
                autoLinked++;
            }
            else if (match.matchScore >= this.config.manualReviewThreshold) {
                link.status = 'under_review';
                manualReviewRequired++;
            }
            else {
                link.status = 'proposed';
            }
            links.push(link);
            this.links.set(link.id, link);
        }
        return {
            totalEntities: entities.length,
            matches,
            links,
            manualReviewRequired,
            autoLinked
        };
    }
    /**
     * Resolve entities between two datasets
     */
    async resolveAcrossSources(sourceEntities, targetEntities) {
        const allMatches = [];
        const links = [];
        let autoLinked = 0;
        let manualReviewRequired = 0;
        // Compare each source entity with all target entities
        for (const sourceEntity of sourceEntities) {
            for (const targetEntity of targetEntities) {
                const match = await this.matchingEngine.matchRecords(sourceEntity, targetEntity, this.config.matchingConfig);
                if (match.matchLevel !== 'no_match') {
                    allMatches.push(match);
                    const link = this.createLink(match);
                    if (match.matchScore >= this.config.autoLinkThreshold) {
                        link.status = 'approved';
                        autoLinked++;
                    }
                    else if (match.matchScore >= this.config.manualReviewThreshold) {
                        link.status = 'under_review';
                        manualReviewRequired++;
                    }
                    else {
                        link.status = 'proposed';
                    }
                    links.push(link);
                    this.links.set(link.id, link);
                }
            }
        }
        return {
            totalEntities: sourceEntities.length + targetEntities.length,
            matches: allMatches,
            links,
            manualReviewRequired,
            autoLinked
        };
    }
    /**
     * Create entity link from match result
     */
    createLink(match) {
        return {
            id: (0, uuid_1.v4)(),
            entity1Id: match.recordId1,
            entity2Id: match.recordId2,
            linkType: this.determineLinkType(match),
            confidence: match.confidence,
            status: 'proposed',
            createdAt: new Date(),
            createdBy: 'system'
        };
    }
    /**
     * Determine link type from match
     */
    determineLinkType(match) {
        if (match.matchLevel === 'exact') {
            return 'exact_match';
        }
        else if (match.matchLevel === 'high') {
            return 'probable_match';
        }
        else if (match.matchLevel === 'medium') {
            return 'possible_match';
        }
        return 'probable_match';
    }
    /**
     * Approve a proposed link
     */
    async approveLink(linkId, reviewedBy) {
        const link = this.links.get(linkId);
        if (!link) {
            throw new Error(`Link ${linkId} not found`);
        }
        link.status = 'approved';
        link.reviewedAt = new Date();
        link.reviewedBy = reviewedBy;
        return link;
    }
    /**
     * Reject a proposed link
     */
    async rejectLink(linkId, reviewedBy) {
        const link = this.links.get(linkId);
        if (!link) {
            throw new Error(`Link ${linkId} not found`);
        }
        link.status = 'rejected';
        link.reviewedAt = new Date();
        link.reviewedBy = reviewedBy;
        return link;
    }
    /**
     * Create manual link between entities
     */
    async createManualLink(entity1Id, entity2Id, createdBy, confidence = 1.0) {
        const link = {
            id: (0, uuid_1.v4)(),
            entity1Id,
            entity2Id,
            linkType: 'manual_link',
            confidence,
            status: 'approved',
            createdAt: new Date(),
            createdBy,
            reviewedAt: new Date(),
            reviewedBy: createdBy
        };
        this.links.set(link.id, link);
        return link;
    }
    /**
     * Get all links for an entity
     */
    async getEntityLinks(entityId) {
        return Array.from(this.links.values()).filter(link => link.entity1Id === entityId || link.entity2Id === entityId);
    }
    /**
     * Get links requiring manual review
     */
    async getLinksForReview() {
        return Array.from(this.links.values()).filter(link => link.status === 'under_review' || link.status === 'proposed');
    }
    /**
     * Get approved links
     */
    async getApprovedLinks() {
        return Array.from(this.links.values()).filter(link => link.status === 'approved');
    }
    /**
     * Find transitive links (if A links to B and B links to C, return C for A)
     */
    async findTransitiveLinks(entityId) {
        const visited = new Set();
        const queue = [entityId];
        const linkedEntities = [];
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const links = await this.getEntityLinks(currentId);
            for (const link of links) {
                if (link.status !== 'approved')
                    continue;
                const otherId = link.entity1Id === currentId ? link.entity2Id : link.entity1Id;
                if (!visited.has(otherId)) {
                    queue.push(otherId);
                    linkedEntities.push(otherId);
                }
            }
        }
        return linkedEntities;
    }
}
exports.EntityResolver = EntityResolver;
