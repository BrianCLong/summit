"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const EmbeddingService_js_1 = __importDefault(require("./EmbeddingService.js"));
const database_js_1 = require("../config/database.js");
const crypto_1 = __importDefault(require("crypto"));
/**
 * SecureFusionService
 *
 * Core engine for "Secure, Air-Gapped Agentic OSINT Fusion".
 * Implements a "Mixture of Experts" (MoE) pattern to process multimodal data.
 */
class SecureFusionService {
    config;
    embeddingService;
    driver;
    logger;
    experts;
    constructor(config = {}) {
        this.config = {
            similarityThreshold: 0.85,
            ...config
        };
        this.embeddingService = new EmbeddingService_js_1.default();
        this.driver = (0, database_js_1.getNeo4jDriver)();
        this.logger = logger_js_1.default;
        // Initialize Experts
        this.experts = {
            TEXT: new TextExpert(this.embeddingService),
            IMAGE: new ImageExpert(this.embeddingService), // Stub with potential for CLIP
            SIGNAL: new SignalExpert(this.embeddingService) // Stub for signal analysis
        };
    }
    /**
     * Main entry point for fusion.
     * Routes the item to the appropriate expert, generates a fusion vector,
     * and resolves the entity against the Knowledge Graph.
     */
    async fuse(item) {
        this.logger.debug('Fusing item', { type: item.type, source: item.source });
        // 1. Route to Expert
        const expert = this.getExpert(item);
        const enrichment = await expert.process(item);
        // 2. Generate Fusion Vector (for now, mostly text-based or simulated multimodal)
        const vector = enrichment.vector;
        // 3. Entity Resolution (Air-Gapped / Local)
        const resolvedEntity = await this.resolveEntity(vector, item, enrichment);
        return resolvedEntity;
    }
    getExpert(item) {
        if (item.type === 'image' || item.mimeType?.startsWith('image/')) {
            return this.experts.IMAGE;
        }
        if (item.type === 'signal' || item.mimeType === 'application/signal') {
            return this.experts.SIGNAL;
        }
        return this.experts.TEXT;
    }
    /**
     * Resolves the entity against the graph.
     * If a similar entity exists (similarity > threshold), it merges.
     * Otherwise, it creates a new entity.
     */
    async resolveEntity(vector, item, enrichment) {
        // In a real implementation, this would use a Vector Index search in Neo4j.
        // For this prototype, we'll simulate the query or use a basic check if we have a mock driver.
        // Check if we are in a test/mock environment
        if (!this.driver) {
            this.logger.warn('No Neo4j driver available, returning mock resolution');
            return {
                id: `mock-entity-${Date.now()}`,
                ...item,
                ...enrichment,
                fused: false,
                status: 'created'
            };
        }
        const session = this.driver.session();
        try {
            // 1. Vector Search (Simulated Cypher)
            // Note: Actual Vector Search syntax depends on Neo4j version and index config.
            // We assume an index 'entity_embeddings' exists.
            // TODO: Migrate to Cypher 25 for Neo4j 2025.01+
            // db.index.vector.queryNodes is deprecated. Use native VECTOR type and vector search.
            const query = `
        CALL db.index.vector.queryNodes('entity_embeddings', 1, $vector)
        YIELD node, score
        WHERE score > $threshold
        RETURN node, score
      `;
            const result = await session.run(query, {
                vector,
                threshold: this.config.similarityThreshold
            });
            if (result.records.length > 0) {
                // MATCH FOUND: Merge
                const match = result.records[0].get('node');
                const score = result.records[0].get('score');
                this.logger.info(`Entity resolved to existing node ${match.properties.id} with score ${score}`);
                // Merge Logic (Last-Writer-Wins or specific policy)
                await this.mergeEntity(session, match.properties.id, item, enrichment);
                return {
                    id: match.properties.id,
                    score,
                    fused: true,
                    status: 'merged'
                };
            }
            else {
                // NO MATCH: Create New
                const newId = await this.createEntity(session, item, enrichment, vector);
                return {
                    id: newId,
                    fused: false,
                    status: 'created'
                };
            }
        }
        catch (e) {
            this.logger.error('Entity resolution failed', e);
            // Fallback: create new without vector search if index missing
            return { id: 'fallback-id', status: 'error', error: e.message };
        }
        finally {
            await session.close();
        }
    }
    async mergeEntity(session, id, item, enrichment) {
        // Update existing entity with new data
        const updateQuery = `
      MATCH (n:Entity {id: $id})
      SET n.lastSeen = $now,
          n.confidence = CASE WHEN n.confidence < $confidence THEN $confidence ELSE n.confidence END
      // In a real system, we would merge properties intelligently
      RETURN n
    `;
        await session.run(updateQuery, {
            id,
            now: new Date().toISOString(),
            confidence: enrichment.confidence || 0.5
        });
    }
    async createEntity(session, item, enrichment, vector) {
        const id = item.id || `entity-${crypto_1.default.randomUUID()}`;
        // TODO: Migrate to Cypher 25 for Neo4j 2025.01+
        // Wrap vector in `vector($vector, dimension, FLOAT32)` to store as native VECTOR type.
        const createQuery = `
      CREATE (n:Entity {
        id: $id,
        type: $type,
        label: $label,
        embedding: $vector,
        confidence: $confidence,
        createdAt: $now,
        lastSeen: $now
      })
      RETURN n.id as id
    `;
        await session.run(createQuery, {
            id,
            type: item.type || 'UNKNOWN',
            label: item.title || item.label || 'Unknown Entity',
            vector,
            confidence: enrichment.confidence || 0.5,
            now: new Date().toISOString()
        });
        return id;
    }
}
/**
 * Expert for Text Analysis
 */
class TextExpert {
    embeddingService;
    constructor(embeddingService) {
        this.embeddingService = embeddingService;
    }
    async process(item) {
        const text = item.text || item.summary || item.label || '';
        const vector = await this.embeddingService.generateEmbedding({ text });
        // Logic to extract keywords, sentiment, etc. could go here
        return {
            vector,
            confidence: 0.8, // Placeholder confidence
            modality: 'text'
        };
    }
}
/**
 * Expert for Image Analysis (Stub)
 */
class ImageExpert {
    embeddingService;
    constructor(embeddingService) {
        this.embeddingService = embeddingService;
    }
    async process(item) {
        // In a real system, this would use CLIP or a Vision model.
        // For this prototype/air-gapped sim, we use the text metadata of the image.
        const textContext = `${item.label || ''} ${item.description || ''} ${item.ocr || ''}`;
        const vector = await this.embeddingService.generateEmbedding({ text: textContext });
        return {
            vector,
            confidence: 0.6,
            modality: 'image'
        };
    }
}
/**
 * Expert for Signal Analysis (Stub)
 */
class SignalExpert {
    embeddingService;
    constructor(embeddingService) {
        this.embeddingService = embeddingService;
    }
    async process(item) {
        // Signal processing logic (e.g. frequency analysis, emitter ID)
        const signalContext = `Signal Type: ${item.signalType} Frequency: ${item.frequency}`;
        const vector = await this.embeddingService.generateEmbedding({ text: signalContext });
        return {
            vector,
            confidence: 0.7,
            modality: 'signal'
        };
    }
}
exports.default = SecureFusionService;
