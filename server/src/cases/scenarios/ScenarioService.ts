import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { InvestigationScenario, ScenarioModification, ModificationType, ScenarioResult } from './types.js';
import { investigationWorkflowService, Investigation } from '../../services/investigationWorkflowService.js';
import logger from '../../config/logger.js';

/**
 * ScenarioService
 *
 * Manages "what-if" scenarios for investigations.
 *
 * WARNING: This service currently uses in-memory storage. Data will be lost on server restart.
 * For production use, this must be refactored to use a persistent store (Postgres/Neo4j).
 */
class ScenarioService extends EventEmitter {
  private scenarios: Map<string, InvestigationScenario> = new Map();
  // Index for fast lookup: investigationId -> Set<scenarioId>
  private investigationIndex: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    logger.info('[SCENARIO] Scenario service initialized');
  }

  /**
   * Create a new scenario from an investigation
   */
  async createScenario(
    investigationId: string,
    name: string,
    description?: string,
    userId: string = 'system'
  ): Promise<InvestigationScenario> {
    const investigation = await investigationWorkflowService.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const now = new Date().toISOString();
    const scenarioId = randomUUID();
    const scenario: InvestigationScenario = {
      id: scenarioId,
      investigationId,
      name,
      description,
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
    this.investigationIndex.get(investigationId)!.add(scenarioId);

    this.emit('scenarioCreated', scenario);
    return scenario;
  }

  /**
   * Add a modification to a scenario
   */
  async addModification(
    scenarioId: string,
    type: ModificationType,
    data: any,
    targetId?: string,
    userId: string = 'system'
  ): Promise<InvestigationScenario> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    // Ensure we have a stable ID for additions if not provided
    if (!targetId && (type === 'ADD_ENTITY' || type === 'ADD_RELATIONSHIP' || type === 'ADD_EVENT')) {
      targetId = randomUUID();
    }

    const modification: ScenarioModification = {
      id: randomUUID(),
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
  getScenario(scenarioId: string): InvestigationScenario | null {
    return this.scenarios.get(scenarioId) || null;
  }

  /**
   * List scenarios for an investigation
   */
  getScenariosForInvestigation(investigationId: string): InvestigationScenario[] {
    const scenarioIds = this.investigationIndex.get(investigationId);
    if (!scenarioIds) {
      return [];
    }

    return Array.from(scenarioIds)
      .map(id => this.scenarios.get(id))
      .filter((s): s is InvestigationScenario => s !== undefined)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Resolve the scenario to its final state
   * Note: This requires the caller to provide the full base entities/relationships map
   * because Investigation only stores IDs.
   */
  resolveState(
    scenarioId: string,
    baseEntities: any[],
    baseRelationships: any[],
    baseTimeline: any[]
  ): ScenarioResult {
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

export const scenarioService = new ScenarioService();
