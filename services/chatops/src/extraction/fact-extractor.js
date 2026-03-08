"use strict";
// @ts-nocheck
/**
 * Fact Extractor for Long-Term Memory
 *
 * Extracts structured facts from conversation summaries for storage in Neo4j.
 *
 * Extraction Categories:
 * - Findings: Discovered information, insights, correlations
 * - Decisions: Choices made, actions taken, conclusions reached
 * - Preferences: User preferences, working styles, priorities
 * - Context: Background information, assumptions, constraints
 * - Hypotheses: Theories, predictions, speculative connections
 *
 * Features:
 * - Confidence scoring
 * - Entity linking
 * - Relationship inference
 * - Contradiction detection
 * - Fact deduplication
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactExtractor = void 0;
exports.createFactExtractor = createFactExtractor;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const uuid_1 = require("uuid");
// =============================================================================
// PROMPTS
// =============================================================================
const EXTRACTION_SYSTEM_PROMPT = `You are an intelligence analyst specializing in knowledge extraction.
Your task is to extract discrete, atomic facts from conversation summaries.

Guidelines:
1. Each fact should be a single, self-contained statement
2. Facts should be objective and verifiable where possible
3. Assign confidence based on evidence strength (0.0-1.0)
4. Identify the category: finding, decision, preference, context, or hypothesis
5. Note any entities mentioned in the fact
6. Identify relationships between facts

Output format (JSON array):
[
  {
    "content": "Atomic fact statement",
    "category": "finding|decision|preference|context|hypothesis",
    "confidence": 0.0-1.0,
    "entities": ["entity1", "entity2"],
    "related_to": [0, 2], // indices of related facts in this batch
    "relationship_types": ["supports", "elaborates"], // relationship to related facts
    "evidence": "Brief note on what supports this fact"
  }
]`;
const EXTRACTION_USER_PROMPT = (summary, existingFacts) => `
Extract facts from this conversation summary:

${summary}

${existingFacts.length > 0 ? `\nExisting facts in this session (check for contradictions and avoid duplicates):\n${existingFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}

Provide your response as a valid JSON array.`;
const CONTRADICTION_PROMPT = (newFact, existingFacts) => `
Analyze if this new fact contradicts any existing facts:

New fact: "${newFact}"

Existing facts:
${existingFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

If there are contradictions, respond with JSON:
{
  "contradicts": [indices of contradicting facts],
  "explanation": "brief explanation of the contradiction"
}

If no contradictions, respond with:
{"contradicts": [], "explanation": "no contradictions found"}`;
// =============================================================================
// FACT EXTRACTOR
// =============================================================================
class FactExtractor {
    client;
    config;
    embeddingService;
    graphRepo;
    constructor(config) {
        this.client = new sdk_1.default({
            apiKey: config.anthropicApiKey,
        });
        this.config = {
            model: config.model ?? 'claude-sonnet-4-20250514',
            deduplicationThreshold: config.deduplicationThreshold ?? 0.9,
            minConfidence: config.minConfidence ?? 0.5,
            anthropicApiKey: config.anthropicApiKey,
            embeddingService: config.embeddingService,
            graphRepository: config.graphRepository,
        };
        this.embeddingService = config.embeddingService;
        this.graphRepo = config.graphRepository;
    }
    // ===========================================================================
    // PUBLIC API
    // ===========================================================================
    /**
     * Extract facts from a summary and store in Neo4j
     */
    async extractAndStore(summary, metadata) {
        // Get existing facts for deduplication and contradiction checking
        const existingFacts = await this.graphRepo.findFactsBySession(metadata.sessionId, metadata.tenantId, 100);
        const existingFactContents = existingFacts.map((f) => f.content);
        // Extract facts using LLM
        const extractedFacts = await this.extractFacts(summary, existingFactContents);
        // Generate embeddings
        const embeddings = await this.embeddingService.embedBatch(extractedFacts.map((f) => f.content));
        // Deduplicate against existing facts
        const { unique, duplicatesSkipped } = await this.deduplicateFacts(extractedFacts, embeddings.embeddings.map((e) => e.embedding), existingFacts);
        // Check for contradictions
        const contradictionsFound = await this.checkContradictions(unique, existingFactContents);
        // Build full fact objects
        const factsWithEmbeddings = unique.map((fact, i) => ({
            factId: (0, uuid_1.v4)(),
            content: fact.content,
            category: fact.category,
            confidence: fact.confidence,
            embedding: embeddings.embeddings[extractedFacts.indexOf(fact)].embedding,
            sourceTurnIds: metadata.turnIds,
            sourceSummaryId: metadata.summaryId,
            relatedEntities: fact.entities,
            relatedFacts: fact.related_to.map((idx) => unique[idx]?.factId).filter(Boolean),
            contradicts: fact.contradicts,
        }));
        // Store in Neo4j
        for (const fact of factsWithEmbeddings) {
            if (fact.confidence >= this.config.minConfidence) {
                await this.graphRepo.createFact({
                    factId: fact.factId,
                    tenantId: metadata.tenantId,
                    userId: metadata.userId,
                    sessionId: metadata.sessionId,
                    content: fact.content,
                    category: fact.category,
                    confidence: fact.confidence,
                    sourceTurnIds: fact.sourceTurnIds,
                    sourceSummaryId: fact.sourceSummaryId,
                    embedding: fact.embedding,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }
        // Create relationships between facts
        const relationships = [];
        for (const fact of unique) {
            for (let i = 0; i < fact.related_to.length; i++) {
                const relatedIdx = fact.related_to[i];
                const relatedFact = unique[relatedIdx];
                if (relatedFact) {
                    const factObj = factsWithEmbeddings.find((f) => f.content === fact.content);
                    const relatedFactObj = factsWithEmbeddings.find((f) => f.content === relatedFact.content);
                    if (factObj && relatedFactObj) {
                        relationships.push({
                            sourceFactId: factObj.factId,
                            targetFactId: relatedFactObj.factId,
                            relationshipType: fact.relationship_types[i] ?? 'related_to',
                            confidence: Math.min(fact.confidence, relatedFact.confidence),
                        });
                        await this.graphRepo.linkFactsAsRelated(factObj.factId, relatedFactObj.factId, fact.relationship_types[i] ?? 'related_to', Math.min(fact.confidence, relatedFact.confidence), metadata.tenantId);
                    }
                }
            }
        }
        return {
            facts: factsWithEmbeddings,
            relationships,
            duplicatesSkipped,
            contradictionsFound,
        };
    }
    /**
     * Find facts similar to a query
     */
    async findSimilarFacts(query, tenantId, options) {
        const queryEmbedding = await this.embeddingService.embed(query);
        const results = await this.graphRepo.searchFactsBySimilarity(queryEmbedding.embedding, tenantId, options?.limit ?? 10);
        return results.filter((r) => r.similarity >= (options?.minSimilarity ?? 0.7));
    }
    /**
     * Verify a fact against existing knowledge
     */
    async verifyFact(factId, verifierId, tenantId) {
        // This would update the fact's verified status in Neo4j
        // Implementation depends on graph schema
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    async extractFacts(summary, existingFacts) {
        const response = await this.client.messages.create({
            model: this.config.model,
            max_tokens: 2000,
            system: EXTRACTION_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: EXTRACTION_USER_PROMPT(summary, existingFacts),
                },
            ],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((f) => ({
                content: f.content ?? '',
                category: f.category ?? 'context',
                confidence: f.confidence ?? 0.5,
                entities: f.entities ?? [],
                related_to: f.related_to ?? [],
                relationship_types: f.relationship_types ?? [],
                evidence: f.evidence ?? '',
            }));
        }
        catch {
            return [];
        }
    }
    async deduplicateFacts(newFacts, newEmbeddings, existingFacts) {
        const unique = [];
        let duplicatesSkipped = 0;
        for (let i = 0; i < newFacts.length; i++) {
            const newFact = newFacts[i];
            const newEmbedding = newEmbeddings[i];
            let isDuplicate = false;
            // Check against existing facts
            for (const existingFact of existingFacts) {
                if (existingFact.embedding) {
                    const similarity = this.embeddingService.cosineSimilarity(newEmbedding, existingFact.embedding);
                    if (similarity >= this.config.deduplicationThreshold) {
                        isDuplicate = true;
                        duplicatesSkipped++;
                        break;
                    }
                }
            }
            // Check against other new facts
            if (!isDuplicate) {
                for (let j = 0; j < i; j++) {
                    const similarity = this.embeddingService.cosineSimilarity(newEmbedding, newEmbeddings[j]);
                    if (similarity >= this.config.deduplicationThreshold) {
                        isDuplicate = true;
                        duplicatesSkipped++;
                        break;
                    }
                }
            }
            if (!isDuplicate) {
                unique.push(newFact);
            }
        }
        return { unique, duplicatesSkipped };
    }
    async checkContradictions(facts, existingFactContents) {
        if (existingFactContents.length === 0) {
            return 0;
        }
        let contradictionsFound = 0;
        for (const fact of facts) {
            const response = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 500,
                messages: [
                    {
                        role: 'user',
                        content: CONTRADICTION_PROMPT(fact.content, existingFactContents),
                    },
                ],
            });
            const text = response.content[0].type === 'text' ? response.content[0].text : '';
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.contradicts && parsed.contradicts.length > 0) {
                        fact.contradicts = parsed.contradicts.map((idx) => `existing-fact-${idx}`);
                        contradictionsFound++;
                    }
                }
            }
            catch {
                // Ignore parsing errors
            }
        }
        return contradictionsFound;
    }
}
exports.FactExtractor = FactExtractor;
// =============================================================================
// FACTORY
// =============================================================================
function createFactExtractor(config) {
    return new FactExtractor(config);
}
