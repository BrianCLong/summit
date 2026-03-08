"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioService = void 0;
const crypto_1 = require("crypto");
const events_1 = require("events");
const investigationWorkflowService_js_1 = require("../../services/investigationWorkflowService.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
/**
 * ScenarioService
 *
 * Manages "what-if" scenarios for investigations.
 *
 * WARNING: This service currently uses in-memory storage. Data will be lost on server restart.
 * For production use, this must be refactored to use a persistent store (Postgres/Neo4j).
 */
class ScenarioService extends events_1.EventEmitter {
    scenarios = new Map();
    // Index for fast lookup: investigationId -> Set<scenarioId>
    investigationIndex = new Map();
    constructor() {
        super();
        logger_js_1.default.info('[SCENARIO] Scenario service initialized');
    }
    /**
     * Create a new scenario from an investigation
     */
    async createScenario(investigationId, name, description, userId = 'system') {
        const investigation = await investigationWorkflowService_js_1.investigationWorkflowService.getInvestigation(investigationId);
        if (!investigation) {
            throw new Error(`Investigation not found: ${investigationId}`);
        }
        const now = new Date().toISOString();
        const scenarioId = (0, crypto_1.randomUUID)();
        const scenario = {
            id: scenarioId,
            investigationId,
            name,
            description: description || undefined,
            baseStateSnapshot: {
                entities: [...investigation.entities],
                relationships: [...investigation.relationships],
                timeline: investigation.timeline.map(t => t.id),
            },
            modifications: [],
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            status: 'DRAFT',
        };
        this.scenarios.set(scenario.id, scenario);
        // Update index
        if (!this.investigationIndex.has(investigationId)) {
            this.investigationIndex.set(investigationId, new Set());
        }
        this.investigationIndex.get(investigationId).add(scenarioId);
        this.emit('scenarioCreated', scenario);
        return scenario;
    }
    /**
     * Add a modification to a scenario
     */
    async addModification(scenarioId, type, data, targetId, userId = 'system') {
        const scenario = this.scenarios.get(scenarioId);
        if (!scenario) {
            throw new Error(`Scenario not found: ${scenarioId}`);
        }
        // Ensure we have a stable ID for additions if not provided
        if (!targetId && (type === 'ADD_ENTITY' || type === 'ADD_RELATIONSHIP' || type === 'ADD_EVENT')) {
            targetId = (0, crypto_1.randomUUID)();
        }
        const modification = {
            id: (0, crypto_1.randomUUID)(),
            type,
            targetId,
            data,
            appliedAt: new Date().toISOString(),
            appliedBy: userId,
        };
        scenario.modifications.push(modification);
        scenario.updatedAt = new Date().toISOString();
        this.scenarios.set(scenario.id, scenario);
        this.emit('scenarioModified', { scenarioId, modification });
        return scenario;
    }
    /**
     * Get a scenario by ID
     */
    getScenario(scenarioId) {
        return this.scenarios.get(scenarioId) || null;
    }
    /**
     * List scenarios for an investigation
     */
    getScenariosForInvestigation(investigationId) {
        const scenarioIds = this.investigationIndex.get(investigationId);
        if (!scenarioIds) {
            return [];
        }
        return Array.from(scenarioIds)
            .map(id => this.scenarios.get(id))
            .filter((s) => s !== undefined)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    /**
     * Resolve the scenario to its final state
     * Note: This requires the caller to provide the full base entities/relationships map
     * because Investigation only stores IDs.
     */
    resolveState(scenarioId, baseEntities, baseRelationships, baseTimeline) {
        const scenario = this.scenarios.get(scenarioId);
        if (!scenario) {
            throw new Error(`Scenario not found: ${scenarioId}`);
        }
        // Clone base state
        let entities = [...baseEntities];
        let relationships = [...baseRelationships];
        let timeline = [...baseTimeline];
        // Apply modifications in order
        for (const mod of scenario.modifications) {
            switch (mod.type) {
                case 'ADD_ENTITY':
                    // mod.targetId is guaranteed to be set by addModification for ADD_* types
                    entities.push({ ...mod.data, id: mod.targetId });
                    break;
                case 'REMOVE_ENTITY':
                    entities = entities.filter(e => e.id !== mod.targetId);
                    // Also remove connected relationships
                    relationships = relationships.filter(r => r.source !== mod.targetId && r.target !== mod.targetId);
                    break;
                case 'UPDATE_ENTITY':
                    const entIdx = entities.findIndex(e => e.id === mod.targetId);
                    if (entIdx >= 0) {
                        entities[entIdx] = { ...entities[entIdx], ...mod.data };
                    }
                    break;
                case 'ADD_RELATIONSHIP':
                    relationships.push({ ...mod.data, id: mod.targetId });
                    break;
                case 'REMOVE_RELATIONSHIP':
                    relationships = relationships.filter(r => r.id !== mod.targetId);
                    break;
                case 'ADD_EVENT':
                    timeline.push({ ...mod.data, id: mod.targetId });
                    break;
                case 'REMOVE_EVENT':
                    timeline = timeline.filter(t => t.id !== mod.targetId);
                    break;
                case 'MODIFY_EVENT':
                    const evtIdx = timeline.findIndex(t => t.id === mod.targetId);
                    if (evtIdx >= 0) {
                        timeline[evtIdx] = { ...timeline[evtIdx], ...mod.data };
                    }
                    break;
            }
        }
        return {
            scenarioId,
            finalState: {
                entities,
                relationships,
                timeline
            },
            metrics: {
                entityCount: entities.length,
                relationshipCount: relationships.length,
                timelineEventCount: timeline.length,
                changesApplied: scenario.modifications.length
            }
        };
    }
}
exports.scenarioService = new ScenarioService();
