"use strict";
/**
 * Inference Rule Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InferenceEngine = void 0;
const uuid_1 = require("uuid");
const inference_js_1 = require("../types/inference.js");
class InferenceEngine {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Create an inference rule
     */
    async createRule(rule) {
        const now = new Date().toISOString();
        const fullRule = {
            ...rule,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
        };
        const validated = inference_js_1.InferenceRuleSchema.parse(fullRule);
        const session = this.driver.session();
        try {
            await session.run(`
        CREATE (r:InferenceRule {
          id: $id,
          name: $name,
          description: $description,
          ruleType: $ruleType,
          pattern: $pattern,
          conclusion: $conclusion,
          confidence: $confidence,
          enabled: $enabled,
          priority: $priority,
          metadata: $metadata,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        `, {
                id: validated.id,
                name: validated.name,
                description: validated.description || null,
                ruleType: validated.ruleType,
                pattern: validated.pattern,
                conclusion: validated.conclusion,
                confidence: validated.confidence,
                enabled: validated.enabled,
                priority: validated.priority,
                metadata: JSON.stringify(validated.metadata || {}),
                createdAt: validated.createdAt,
                updatedAt: validated.updatedAt,
            });
            return validated;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Apply all enabled inference rules
     */
    async applyAllRules() {
        const session = this.driver.session();
        try {
            // Get all enabled rules ordered by priority
            const rulesResult = await session.run(`
        MATCH (r:InferenceRule {enabled: true})
        RETURN r
        ORDER BY r.priority DESC
        `);
            const rules = rulesResult.records.map((record) => {
                const props = record.get('r').properties;
                return inference_js_1.InferenceRuleSchema.parse({
                    ...props,
                    metadata: JSON.parse(props.metadata || '{}'),
                });
            });
            const inferredFacts = [];
            // Apply each rule
            for (const rule of rules) {
                const facts = await this.applyRule(rule);
                inferredFacts.push(...facts);
            }
            return inferredFacts;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Apply a specific inference rule
     */
    async applyRule(rule) {
        const session = this.driver.session();
        try {
            const inferredFacts = [];
            // Match pattern and create conclusions
            // This is a simplified implementation
            // In production, parse and execute the pattern/conclusion properly
            if (rule.ruleType === 'transitive') {
                // Example: Apply transitive closure
                // If A-[:REL]->B and B-[:REL]->C, then create A-[:REL]->C
                const result = await session.run(`
          MATCH (a)-[r1:${this.extractRelType(rule.pattern)}]->(b)-[r2:${this.extractRelType(rule.pattern)}]->(c)
          WHERE NOT EXISTS((a)-[:${this.extractRelType(rule.pattern)}]->(c))
          CREATE (a)-[r:${this.extractRelType(rule.conclusion)} {
            id: $id,
            confidence: $confidence,
            inferred: true,
            inferredBy: $ruleId,
            createdAt: datetime()
          }]->(c)
          RETURN a.id as sourceId, c.id as targetId, r.id as relId
          LIMIT 1000
          `, {
                    id: (0, uuid_1.v4)(),
                    confidence: rule.confidence,
                    ruleId: rule.id,
                });
                for (const record of result.records) {
                    inferredFacts.push({
                        id: (0, uuid_1.v4)(),
                        factType: 'relationship',
                        sourceRuleId: rule.id,
                        sourceRuleName: rule.name,
                        confidence: rule.confidence,
                        premises: [record.get('sourceId'), record.get('targetId')],
                        conclusion: {
                            relationshipId: record.get('relId'),
                        },
                        derivationChain: [rule.id],
                        createdAt: new Date().toISOString(),
                    });
                }
            }
            else if (rule.ruleType === 'symmetric') {
                // Example: If A knows B, then B knows A
                const result = await session.run(`
          MATCH (a)-[r:${this.extractRelType(rule.pattern)}]->(b)
          WHERE NOT EXISTS((b)-[:${this.extractRelType(rule.pattern)}]->(a))
          CREATE (b)-[r2:${this.extractRelType(rule.conclusion)} {
            id: $id,
            confidence: $confidence,
            inferred: true,
            inferredBy: $ruleId,
            createdAt: datetime()
          }]->(a)
          RETURN a.id as sourceId, b.id as targetId, r2.id as relId
          LIMIT 1000
          `, {
                    id: (0, uuid_1.v4)(),
                    confidence: rule.confidence,
                    ruleId: rule.id,
                });
                for (const record of result.records) {
                    inferredFacts.push({
                        id: (0, uuid_1.v4)(),
                        factType: 'relationship',
                        sourceRuleId: rule.id,
                        sourceRuleName: rule.name,
                        confidence: rule.confidence,
                        premises: [record.get('sourceId'), record.get('targetId')],
                        conclusion: {
                            relationshipId: record.get('relId'),
                        },
                        derivationChain: [rule.id],
                        createdAt: new Date().toISOString(),
                    });
                }
            }
            // Store inferred facts
            for (const fact of inferredFacts) {
                await this.storeInferredFact(fact);
            }
            return inferredFacts;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Compute transitive closure for a relationship type
     */
    async computeTransitiveClosure(relationshipType) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (a)-[:${relationshipType}*]->(b)
        WHERE NOT EXISTS((a)-[:${relationshipType}]->(b))
        CREATE (a)-[r:${relationshipType}_CLOSURE {
          inferred: true,
          confidence: 0.9,
          createdAt: datetime()
        }]->(b)
        RETURN count(r) as closureCount
        `);
            return result.records[0]?.get('closureCount').toNumber() || 0;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store an inferred fact
     */
    async storeInferredFact(fact) {
        const validated = inference_js_1.InferredFactSchema.parse(fact);
        const session = this.driver.session();
        try {
            await session.run(`
        CREATE (f:InferredFact {
          id: $id,
          factType: $factType,
          sourceRuleId: $sourceRuleId,
          sourceRuleName: $sourceRuleName,
          confidence: $confidence,
          premises: $premises,
          conclusion: $conclusion,
          derivationChain: $derivationChain,
          createdAt: datetime($createdAt)
        })
        `, {
                id: validated.id,
                factType: validated.factType,
                sourceRuleId: validated.sourceRuleId,
                sourceRuleName: validated.sourceRuleName,
                confidence: validated.confidence,
                premises: JSON.stringify(validated.premises),
                conclusion: JSON.stringify(validated.conclusion),
                derivationChain: JSON.stringify(validated.derivationChain),
                createdAt: validated.createdAt,
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all inference rules
     */
    async getAllRules() {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (r:InferenceRule)
        RETURN r
        ORDER BY r.priority DESC
        `);
            return result.records.map((record) => {
                const props = record.get('r').properties;
                return inference_js_1.InferenceRuleSchema.parse({
                    ...props,
                    metadata: JSON.parse(props.metadata || '{}'),
                });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Delete an inference rule
     */
    async deleteRule(ruleId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (r:InferenceRule {id: $ruleId})
        DELETE r
        RETURN count(r) as deleted
        `, { ruleId });
            return result.records[0].get('deleted').toNumber() > 0;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Extract relationship type from pattern (helper method)
     */
    extractRelType(pattern) {
        // Simple extraction - in production, use proper pattern parsing
        const match = pattern.match(/:(\w+)/);
        return match ? match[1] : 'RELATED_TO';
    }
}
exports.InferenceEngine = InferenceEngine;
