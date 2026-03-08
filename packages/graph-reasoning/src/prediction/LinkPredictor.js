"use strict";
/**
 * Missing Link Prediction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkPredictor = void 0;
const uuid_1 = require("uuid");
const inference_js_1 = require("../types/inference.js");
class LinkPredictor {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Predict missing links using path-based method
     */
    async predictLinks(entityId, relationshipType, minConfidence = 0.5, limit = 10) {
        const session = this.driver.session();
        try {
            // Use path-based features for link prediction
            // Common neighbors, path length, etc.
            const relTypeFilter = relationshipType ? `:${relationshipType}` : '';
            const result = await session.run(`
        MATCH (source {id: $entityId})
        MATCH (source)-[${relTypeFilter}*2..3]-(target)
        WHERE NOT EXISTS((source)-[${relTypeFilter}]-(target))
        WITH source, target, count(*) as pathCount
        MATCH (source)-[]-(commonNeighbor)-[]-(target)
        WITH source, target, pathCount, count(DISTINCT commonNeighbor) as commonNeighbors
        WITH source, target,
             toFloat(commonNeighbors) / (pathCount + 1) as score
        WHERE score >= $minConfidence
        RETURN target.id as targetId, score
        ORDER BY score DESC
        LIMIT $limit
        `, { entityId, minConfidence, limit });
            const predictions = [];
            for (const record of result.records) {
                const prediction = {
                    id: (0, uuid_1.v4)(),
                    sourceEntityId: entityId,
                    targetEntityId: record.get('targetId'),
                    predictedRelationType: relationshipType || 'RELATED_TO',
                    confidence: record.get('score'),
                    predictionMethod: 'path_ranking',
                    features: {
                        commonNeighbors: record.get('score'),
                    },
                    validated: false,
                    createdAt: new Date().toISOString(),
                };
                predictions.push(inference_js_1.PredictedLinkSchema.parse(prediction));
            }
            return predictions;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Predict links using Adamic-Adar scoring
     */
    async predictLinksAdamicAdar(entityId, limit = 10) {
        const session = this.driver.session();
        try {
            // Adamic-Adar: sum of 1/log(degree(common_neighbor))
            const result = await session.run(`
        MATCH (source {id: $entityId})
        MATCH (source)-[]-(cn)-[]-(target)
        WHERE NOT EXISTS((source)-[]-(target))
          AND source <> target
        WITH source, target, cn
        MATCH (cn)-[]-(other)
        WITH source, target, cn, count(DISTINCT other) as degree
        WITH source, target, sum(1.0 / log(degree + 1)) as score
        WHERE score > 0
        RETURN target.id as targetId, score
        ORDER BY score DESC
        LIMIT $limit
        `, { entityId, limit });
            const predictions = [];
            for (const record of result.records) {
                const prediction = {
                    id: (0, uuid_1.v4)(),
                    sourceEntityId: entityId,
                    targetEntityId: record.get('targetId'),
                    predictedRelationType: 'RELATED_TO',
                    confidence: Math.min(record.get('score') / 10, 1.0), // Normalize
                    predictionMethod: 'path_ranking',
                    features: {
                        adamicAdar: record.get('score'),
                    },
                    validated: false,
                    createdAt: new Date().toISOString(),
                };
                predictions.push(inference_js_1.PredictedLinkSchema.parse(prediction));
            }
            return predictions;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store a predicted link
     */
    async storePredictedLink(link) {
        const validated = inference_js_1.PredictedLinkSchema.parse(link);
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (source {id: $sourceEntityId})
        MATCH (target {id: $targetEntityId})
        CREATE (source)-[p:PREDICTED_LINK {
          id: $id,
          predictedRelationType: $predictedRelationType,
          confidence: $confidence,
          predictionMethod: $predictionMethod,
          features: $features,
          supportingEvidence: $supportingEvidence,
          validated: $validated,
          validatedBy: $validatedBy,
          validatedAt: $validatedAt,
          createdAt: datetime($createdAt)
        }]->(target)
        `, {
                id: validated.id,
                sourceEntityId: validated.sourceEntityId,
                targetEntityId: validated.targetEntityId,
                predictedRelationType: validated.predictedRelationType,
                confidence: validated.confidence,
                predictionMethod: validated.predictionMethod,
                features: JSON.stringify(validated.features || {}),
                supportingEvidence: JSON.stringify(validated.supportingEvidence || []),
                validated: validated.validated,
                validatedBy: validated.validatedBy || null,
                validatedAt: validated.validatedAt || null,
                createdAt: validated.createdAt,
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Validate a predicted link
     */
    async validatePredictedLink(linkId, validatedBy, isValid) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH ()-[p:PREDICTED_LINK {id: $linkId}]->()
        SET p.validated = $isValid,
            p.validatedBy = $validatedBy,
            p.validatedAt = datetime()
        `, { linkId, validatedBy, isValid });
            // If valid, create actual relationship
            if (isValid) {
                await session.run(`
          MATCH (source)-[p:PREDICTED_LINK {id: $linkId}]->(target)
          CREATE (source)-[r {
            id: randomUUID(),
            type: p.predictedRelationType,
            confidence: p.confidence,
            derivedFrom: $linkId,
            createdAt: datetime()
          }]->(target)
          `, { linkId });
            }
        }
        finally {
            await session.close();
        }
    }
}
exports.LinkPredictor = LinkPredictor;
