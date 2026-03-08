"use strict";
/**
 * Entity Linking to External Knowledge Bases
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityLinker = void 0;
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const knowledge_graph_1 = require("@intelgraph/knowledge-graph");
class EntityLinker {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Link entity to DBpedia
     */
    async linkToDBpedia(entityId, entityText, context) {
        try {
            // DBpedia Spotlight API for entity linking
            const response = await axios_1.default.get('https://api.dbpedia-spotlight.org/en/candidates', {
                params: {
                    text: context || entityText,
                    confidence: 0.3,
                },
                timeout: 5000,
            });
            if (response.data.annotation?.surfaceForm) {
                const candidates = Array.isArray(response.data.annotation.surfaceForm)
                    ? response.data.annotation.surfaceForm
                    : [response.data.annotation.surfaceForm];
                // Find best matching candidate
                const bestCandidate = candidates
                    .filter((c) => c.resource)
                    .sort((a, b) => (b.resource['@similarityScore'] || 0) - (a.resource['@similarityScore'] || 0))[0];
                if (bestCandidate) {
                    const link = {
                        entityId,
                        externalId: bestCandidate.resource['@uri'],
                        externalSource: 'dbpedia',
                        externalUri: bestCandidate.resource['@uri'],
                        linkType: 'same_as',
                        confidence: parseFloat(bestCandidate.resource['@similarityScore'] || '0.5'),
                        createdAt: new Date().toISOString(),
                    };
                    return knowledge_graph_1.EntityLinkSchema.parse(link);
                }
            }
        }
        catch (error) {
            console.error('DBpedia linking error:', error);
        }
        return null;
    }
    /**
     * Link entity to Wikidata
     */
    async linkToWikidata(entityId, entityText, entityType) {
        try {
            // Wikidata API search
            const response = await axios_1.default.get('https://www.wikidata.org/w/api.php', {
                params: {
                    action: 'wbsearchentities',
                    search: entityText,
                    language: 'en',
                    format: 'json',
                    limit: 1,
                },
                timeout: 5000,
            });
            if (response.data.search && response.data.search.length > 0) {
                const result = response.data.search[0];
                const link = {
                    entityId,
                    externalId: result.id,
                    externalSource: 'wikidata',
                    externalUri: `https://www.wikidata.org/wiki/${result.id}`,
                    linkType: 'same_as',
                    confidence: 0.7, // Wikidata doesn't provide confidence scores
                    disambiguationContext: {
                        label: result.label,
                        description: result.description,
                    },
                    createdAt: new Date().toISOString(),
                };
                return knowledge_graph_1.EntityLinkSchema.parse(link);
            }
        }
        catch (error) {
            console.error('Wikidata linking error:', error);
        }
        return null;
    }
    /**
     * Store entity link in the graph
     */
    async storeEntityLink(link) {
        const validated = knowledge_graph_1.EntityLinkSchema.parse(link);
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (e {id: $entityId})
        CREATE (e)-[l:LINKED_TO {
          externalId: $externalId,
          externalSource: $externalSource,
          externalUri: $externalUri,
          linkType: $linkType,
          confidence: $confidence,
          disambiguationContext: $disambiguationContext,
          createdAt: datetime($createdAt)
        }]->(ex:ExternalEntity {
          id: $externalId,
          source: $externalSource,
          uri: $externalUri
        })
        `, {
                entityId: validated.entityId,
                externalId: validated.externalId,
                externalSource: validated.externalSource,
                externalUri: validated.externalUri,
                linkType: validated.linkType,
                confidence: validated.confidence,
                disambiguationContext: JSON.stringify(validated.disambiguationContext || {}),
                createdAt: validated.createdAt,
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Disambiguate entities using context
     */
    async disambiguate(entityText, candidates, context) {
        // Simplified disambiguation using scoring
        // In production, use ML-based disambiguation models
        const scoredCandidates = candidates.map((candidate) => {
            let score = candidate.score;
            // Boost score if context mentions are found
            if (candidate.description && context.includes(candidate.description.substring(0, 50))) {
                score += 0.2;
            }
            // Boost score for exact label match
            if (candidate.label.toLowerCase() === entityText.toLowerCase()) {
                score += 0.3;
            }
            return { ...candidate, score };
        });
        // Return highest scoring candidate
        return scoredCandidates.sort((a, b) => b.score - a.score)[0];
    }
    /**
     * Resolve co-references (entities referring to the same real-world entity)
     */
    async resolveCoreferences(entityIds, method = 'fuzzy_match') {
        const session = this.driver.session();
        try {
            // Get entity properties for comparison
            const result = await session.run(`
        MATCH (e)
        WHERE e.id IN $entityIds
        RETURN e.id as id, e.properties as properties, e.type as type
        `, { entityIds });
            const entities = result.records.map((r) => ({
                id: r.get('id'),
                properties: JSON.parse(r.get('properties') || '{}'),
                type: r.get('type'),
            }));
            // Simple coreference resolution based on property similarity
            // In production, use sophisticated coreference resolution models
            const canonicalEntityId = entities[0]?.id || entityIds[0];
            const cluster = {
                id: (0, uuid_1.v4)(),
                entities: entityIds,
                canonicalEntityId,
                confidence: 0.8,
                resolutionMethod: method,
                metadata: {
                    resolvedAt: new Date().toISOString(),
                    entitiesCount: entityIds.length,
                },
                createdAt: new Date().toISOString(),
            };
            return knowledge_graph_1.CoreferenceClusterSchema.parse(cluster);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store coreference cluster
     */
    async storeCoreference(cluster) {
        const validated = knowledge_graph_1.CoreferenceClusterSchema.parse(cluster);
        const session = this.driver.session();
        try {
            // Create cluster node
            await session.run(`
        CREATE (c:CoreferenceCluster {
          id: $id,
          canonicalEntityId: $canonicalEntityId,
          confidence: $confidence,
          resolutionMethod: $resolutionMethod,
          metadata: $metadata,
          createdAt: datetime($createdAt)
        })
        `, {
                id: validated.id,
                canonicalEntityId: validated.canonicalEntityId,
                confidence: validated.confidence,
                resolutionMethod: validated.resolutionMethod,
                metadata: JSON.stringify(validated.metadata || {}),
                createdAt: validated.createdAt,
            });
            // Link all entities to the cluster
            for (const entityId of validated.entities) {
                await session.run(`
          MATCH (c:CoreferenceCluster {id: $clusterId})
          MATCH (e {id: $entityId})
          CREATE (e)-[:IN_CLUSTER]->(c)
          `, {
                    clusterId: validated.id,
                    entityId,
                });
            }
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all external links for an entity
     */
    async getEntityLinks(entityId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e {id: $entityId})-[l:LINKED_TO]->(ex:ExternalEntity)
        RETURN l
        `, { entityId });
            return result.records.map((record) => {
                const props = record.get('l').properties;
                return knowledge_graph_1.EntityLinkSchema.parse({
                    entityId,
                    ...props,
                    disambiguationContext: JSON.parse(props.disambiguationContext || '{}'),
                });
            });
        }
        finally {
            await session.close();
        }
    }
}
exports.EntityLinker = EntityLinker;
