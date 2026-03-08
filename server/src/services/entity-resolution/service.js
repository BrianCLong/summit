"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolutionService = void 0;
const scoring_js_1 = require("./scoring.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const neo4j_js_1 = require("../../graph/neo4j.js");
const tracer_js_1 = require("../../observability/tracer.js");
class EntityResolutionService {
    scoringEngine;
    config;
    constructor(config) {
        this.config = {
            thresholds: { merge: 0.95, link: 0.8, review: 0.6 },
            weights: {
                exactId: 1.0,
                email: 0.9,
                phone: 0.8,
                name: 0.6
            },
            enabledFeatures: ['exactId', 'email', 'phone', 'name'],
            ...config
        };
        this.scoringEngine = new scoring_js_1.ScoringEngine(this.config);
    }
    /**
     * Evaluates a batch of new entities against the existing graph to propose resolutions.
     * This is a simplified "blocking" approach where we query for potential candidates.
     */
    async resolveBatch(entities) {
        return (0, tracer_js_1.getTracer)().withSpan('EntityResolutionService.resolveBatch', async (span) => {
            span.setAttribute('er.batch_size', entities.length);
            const { default: pLimit } = await Promise.resolve().then(() => __importStar(require('p-limit')));
            const limit = pLimit(10); // Concurrency limit
            const decisions = [];
            const tasks = entities.map(entity => limit(async () => {
                // 1. Find candidates in the graph (Blocking phase)
                const candidates = await this.findCandidates(entity);
                for (const candidateEntity of candidates) {
                    // 2. Score candidate
                    const { score, features, reasons } = this.scoringEngine.calculateScore(entity, candidateEntity);
                    // 3. Make Decision
                    const decisionType = this.makeDecision(score);
                    if (decisionType !== 'NO_MATCH') {
                        decisions.push({
                            candidate: {
                                sourceEntityId: entity.id,
                                targetEntityId: candidateEntity.id,
                                overallScore: score,
                                features,
                                reasons
                            },
                            decision: decisionType,
                            confidence: score,
                            ruleId: 'default-weighted-score'
                        });
                    }
                }
            }));
            await Promise.all(tasks);
            return decisions;
        });
    }
    /**
     * Executes a resolution decision (Merge or Link).
     */
    async applyDecision(decision, tenantId, actorId) {
        const { sourceEntityId, targetEntityId } = decision.candidate;
        if (decision.decision === 'MERGE') {
            await this.executeMerge(sourceEntityId, targetEntityId, tenantId, actorId, decision);
        }
        else if (decision.decision === 'LINK') {
            await this.executeLink(sourceEntityId, targetEntityId, tenantId, actorId, decision);
        }
    }
    makeDecision(score) {
        if (score >= this.config.thresholds.merge)
            return 'MERGE';
        if (score >= this.config.thresholds.link)
            return 'LINK';
        if (score >= this.config.thresholds.review)
            return 'REVIEW';
        return 'NO_MATCH';
    }
    async findCandidates(entity) {
        const driver = (0, neo4j_js_1.getDriver)();
        const session = driver.session();
        const cypher = `
      MATCH (n:Entity {tenantId: $tenantId})
      WHERE n.id <> $id AND (
        (n.email IS NOT NULL AND n.email = $email) OR
        (n.name IS NOT NULL AND n.name = $name) OR
        (n.ssn IS NOT NULL AND n.ssn = $ssn)
      )
      RETURN n { .* } as properties, labels(n) as labels, n.id as id
    `;
        try {
            const result = await session.run(cypher, {
                tenantId: entity.tenantId,
                id: entity.id,
                email: entity.properties.email || '',
                name: entity.properties.name || '',
                ssn: entity.properties.ssn || ''
            });
            return result.records.map(record => {
                const props = record.get('properties');
                const id = record.get('id');
                return {
                    id: id,
                    type: 'Entity', // Simplified
                    properties: props,
                    tenantId: entity.tenantId
                };
            });
        }
        catch (error) {
            console.error('Error finding candidates:', error);
            return [];
        }
        finally {
            await session.close();
        }
    }
    async executeMerge(sourceId, targetId, tenantId, actorId, decision) {
        const driver = (0, neo4j_js_1.getDriver)();
        const session = driver.session();
        try {
            // 1. Log to Provenance Ledger
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId,
                actionType: 'ENTITY_MERGE',
                resourceType: 'entity',
                resourceId: targetId,
                actorId,
                actorType: 'system',
                payload: {
                    sourceId,
                    targetId,
                    decision
                },
                metadata: {
                    purpose: 'Entity Resolution Merge'
                }
            });
            // 2. Perform Graph Merge
            // Use apoc.refactor.mergeNodes which handles property combination and edge movement correctly.
            const cypher = `
            MATCH (source:Entity {id: $sourceId})
            MATCH (target:Entity {id: $targetId})
            CALL apoc.refactor.mergeNodes([target, source], {
                properties: {
                    mode: 'discard'
                },
                mergeRels: true
            }) YIELD node
            RETURN node
         `;
            // Use executeWrite for Neo4j Driver v5
            await session.executeWrite(tx => tx.run(cypher, { sourceId, targetId }));
        }
        finally {
            await session.close();
        }
    }
    async executeLink(sourceId, targetId, tenantId, actorId, decision) {
        const driver = (0, neo4j_js_1.getDriver)();
        const session = driver.session();
        try {
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId,
                actionType: 'ENTITY_LINK',
                resourceType: 'entity',
                resourceId: sourceId, // Logging on both or source
                actorId,
                actorType: 'system',
                payload: {
                    sourceId,
                    targetId,
                    decision
                },
                metadata: {
                    purpose: 'Entity Resolution Link'
                }
            });
            const cypher = `
            MATCH (source:Entity {id: $sourceId})
            MATCH (target:Entity {id: $targetId})
            MERGE (source)-[r:SAME_AS]->(target)
            SET r.confidence = $confidence, r.createdAt = datetime()
        `;
            // Use executeWrite for Neo4j Driver v5
            await session.executeWrite(tx => tx.run(cypher, {
                sourceId,
                targetId,
                confidence: decision.confidence
            }));
        }
        finally {
            await session.close();
        }
    }
}
exports.EntityResolutionService = EntityResolutionService;
