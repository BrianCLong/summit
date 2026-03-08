"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentGraphIntegration = void 0;
const database_js_1 = require("../../config/database.js"); // Assuming this exists or mocking it
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
/**
 * SentimentGraphIntegration
 *
 * Handles storing sentiment analysis results into the IntelGraph.
 */
class SentimentGraphIntegration {
    /**
     * Stores the multimodal sentiment result attached to a specific Entity (Person, Communication, etc.)
     */
    async storeSentimentAnalysis(entityId, analysis, tenantId) {
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            const cypher = `
        MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
        CREATE (s:SentimentAnalysis {
          id: randomUUID(),
          timestamp: $timestamp,
          primaryEmotion: $primaryEmotion,
          sentimentScore: $sentimentScore,
          sentimentLabel: $sentimentLabel,
          confidence: $confidence,
          coherence: $coherence,
          tenantId: $tenantId
        })
        MERGE (e)-[:HAS_SENTIMENT]->(s)
        SET s.audioEmotions = $audioEmotions,
            s.visualEmotions = $visualEmotions,
            s.textEmotions = $textEmotions
        RETURN s.id
      `;
            await session.run(cypher, {
                entityId,
                tenantId,
                timestamp: analysis.timestamp,
                primaryEmotion: analysis.primaryEmotion,
                sentimentScore: analysis.sentiment.score,
                sentimentLabel: analysis.sentiment.label,
                confidence: analysis.sentiment.confidence,
                coherence: analysis.coherence,
                audioEmotions: JSON.stringify(analysis.modalities.audio?.emotions || {}),
                visualEmotions: JSON.stringify(analysis.modalities.visual?.faces[0]?.emotions || {}), // Simplify for graph property
                textEmotions: JSON.stringify(analysis.modalities.text?.emotions || {})
            });
            logger_js_1.default.info(`Stored sentiment analysis for entity ${entityId}`);
        }
        catch (error) {
            logger_js_1.default.error('Failed to store sentiment analysis', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find entities with specific sentiment (e.g. "angry")
     */
    async findEntitiesByEmotion(emotion, tenantId, minConfidence = 0.6) {
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            const cypher = `
        MATCH (e:Entity {tenantId: $tenantId})-[:HAS_SENTIMENT]->(s:SentimentAnalysis)
        WHERE s.primaryEmotion = $emotion AND s.confidence >= $minConfidence
        RETURN e, s
        ORDER BY s.timestamp DESC
        LIMIT 50
      `;
            const result = await session.run(cypher, { emotion, tenantId, minConfidence });
            return result.records.map((r) => ({
                entity: r.get('e').properties,
                sentiment: r.get('s').properties
            }));
        }
        finally {
            await session.close();
        }
    }
}
exports.SentimentGraphIntegration = SentimentGraphIntegration;
