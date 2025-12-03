import { randomUUID } from 'node:crypto';
import type {
  EntityDynamicState,
  NarrativeEvent,
  NarrativeNarration,
  NarrativeState,
  NarrativeGeneratorMode,
  SimulationConfig,
  StoryArc,
  TimeVariantParameter,
  SimulationEntity,
  Negotiation,
  ScenarioDefinition,
  ScenarioResult,
  TelemetryInput,
} from './types.js';
import {
  LLMDrivenNarrativeGenerator,
  NarrativeGenerator,
  RuleBasedNarrativeGenerator,
} from './generators.js';
import { PredictivePsyOpsLayer } from './psyops-layer.js';

const HISTORY_LIMIT = 64;
const MOMENTUM_SENSITIVITY = 0.05;

export class NarrativeSimulationEngine {
  private state: NarrativeState;
  private generator: NarrativeGenerator;
  private psyOpsLayer: PredictivePsyOpsLayer;
  private readonly eventQueue: NarrativeEvent[] = [];
  private readonly scenarioDefinitions: Map<string, ScenarioDefinition> = new Map();

  constructor(private readonly config: SimulationConfig) {
    const start = new Date();
    const entities = Object.fromEntries(
      config.initialEntities.map((entity) => [
        entity.id,
        this.bootstrapEntityState(entity),
      ]),
    );

    const parameters = Object.fromEntries(
      (config.initialParameters ?? []).map((parameter) => [
        parameter.name,
        this.bootstrapParameter(parameter.name, parameter.value),
      ]),
    );

    this.state = {
      id: config.id,
      name: config.name,
      tick: 0,
      startedAt: start,
      timestamp: start,
      tickIntervalMinutes: config.tickIntervalMinutes,
      themes: config.themes,
      entities,
      parameters,
      arcs: [],
      recentEvents: [],
      negotiations: {},
      scenarios: [],
      psyOpsForecasts: [],
      narrative: {
        mode: 'rule-based',
        summary: 'Simulation initialized.',
        highlights: [],
        risks: [],
        opportunities: [],
      },
      metadata: config.metadata,
    };

    this.generator = this.createGenerator(config.generatorMode, config);
    this.psyOpsLayer = new PredictivePsyOpsLayer(this);
    this.state.arcs = this.computeArcs();
  }

  getState(): NarrativeState {
    return this.state;
  }

  getSummary() {
    const { id, name, tick, themes } = this.state;
    return {
      id,
      name,
      tick,
      themes,
      activeEntities: Object.keys(this.state.entities).length,
      activeEvents: this.eventQueue.length,
    };
  }

  setGeneratorMode(
    mode: NarrativeGeneratorMode,
    llmClientConfig?: SimulationConfig['llmClient'],
  ): void {
    this.generator = this.createGenerator(mode, {
      ...this.config,
      llmClient: llmClientConfig,
    });
  }

  registerScenario(definition: ScenarioDefinition): void {
    this.scenarioDefinitions.set(definition.id, definition);
  }

  ingestTelemetry(input: TelemetryInput): void {
    const event: NarrativeEvent = {
      id: randomUUID(),
      type: 'telemetry',
      theme: 'system',
      intensity: Math.min(Math.abs(input.value), 1), // Normalize roughly
      description: `Telemetry update from ${input.source}: ${input.metric} = ${input.value}`,
      metadata: { ...input.metadata, telemetry: input },
      // Map to entity if provided
      actorId: input.entityMapping,
    };
    this.queueEvent(event);
  }

  queueEvent(event: NarrativeEvent): void {
    const scheduledTick = event.scheduledTick ?? this.state.tick + 1;
    this.eventQueue.push({ ...event, scheduledTick });
  }

  async tick(steps = 1): Promise<NarrativeState> {
    for (let index = 0; index < steps; index += 1) {
      this.advanceClock();

      this.processNegotiations();

      const ready = this.dequeueReadyEvents();
      ready.forEach((event) => this.applyEvent(event));

      this.evaluateScenarios();

      this.state.recentEvents = [...this.state.recentEvents, ...ready].slice(
        -HISTORY_LIMIT,
      );
      this.state.arcs = this.computeArcs();

      // Run PsyOps forecast every 5 ticks to save resources
      if (this.state.tick % 5 === 0) {
        this.state.psyOpsForecasts = this.psyOpsLayer.generateForecast(10);
      }

      await this.refreshNarrative(ready);
      this.applyNaturalDynamics();
    }

    return this.state;
  }

  injectActorAction(
    actorId: string,
    description: string,
    overrides?: Partial<NarrativeEvent>,
  ): void {
    const action: NarrativeEvent = {
      id: randomUUID(),
      type: 'intervention',
      actorId,
      targetIds: overrides?.targetIds,
      theme: overrides?.theme ?? this.state.themes[0],
      intensity: overrides?.intensity ?? 0.6,
      sentimentShift: overrides?.sentimentShift ?? 0.1,
      influenceShift: overrides?.influenceShift ?? 0.05,
      description,
      parameterAdjustments: overrides?.parameterAdjustments,
      scheduledTick: overrides?.scheduledTick ?? this.state.tick + 1,
      metadata: overrides?.metadata,
    };

    this.queueEvent(action);
  }

  startNegotiation(initiatorId: string, targetIds: string[], topic: string): string {
    const id = randomUUID();
    const negotiation: Negotiation = {
      id,
      initiatorId,
      targetIds,
      topic,
      status: 'proposed',
      startTick: this.state.tick,
      lastUpdateTick: this.state.tick,
      turns: 0,
      currentOffers: {},
    };
    this.state.negotiations[id] = negotiation;
    return id;
  }

  updateEntityProfile(entity: SimulationEntity): void {
    this.state.entities[entity.id] = {
      ...this.bootstrapEntityState(entity),
      history: this.state.entities[entity.id]?.history ?? [],
    };
  }

  private processNegotiations(): void {
    Object.values(this.state.negotiations).forEach((neg) => {
      if (neg.status === 'active' || neg.status === 'proposed') {
        neg.turns += 1;
        neg.lastUpdateTick = this.state.tick;

        // Simple simulation logic: random chance to progress or fail
        // In a real system, this would use agent logic or LLM calls
        if (neg.turns > 10) {
           neg.status = 'stalemate';
        } else {
           // Simulate offer updates
           const entities = [neg.initiatorId, ...neg.targetIds];
           entities.forEach(eid => {
               const ent = this.state.entities[eid];
               const currentOffer = neg.currentOffers[eid] || 0.5;
               // Stance affects offer delta
               let delta = 0;
               if (ent.negotiationStance === 'aggressive') delta = 0.05;
               else if (ent.negotiationStance === 'cooperative') delta = -0.05;

               neg.currentOffers[eid] = this.clamp(currentOffer + (Math.random() * 0.1 - 0.05) + delta, 0, 1);
           });

           // Check for agreement (convergence of offers)
           const offers = Object.values(neg.currentOffers);
           if (offers.length > 1) {
             const min = Math.min(...offers);
             const max = Math.max(...offers);
             if (max - min < 0.1) {
               neg.status = 'agreement';
               this.queueEvent({
                 id: randomUUID(),
                 type: 'social',
                 theme: 'negotiation',
                 intensity: 0.8,
                 description: `Negotiation on ${neg.topic} reached agreement.`,
                 actorId: neg.initiatorId,
                 targetIds: neg.targetIds,
                 sentimentShift: 0.2,
               });
             }
           }
        }
      }
    });
  }

  private evaluateScenarios(): void {
    for (const def of this.scenarioDefinitions.values()) {
      try {
        if (def.condition(this.state)) {
           // Check if already triggered recently to avoid spam?
           // For now, just record it.
           const result: ScenarioResult = {
             scenarioId: def.id,
             triggered: true,
             tick: this.state.tick,
           };
           this.state.scenarios.push(result);

           // Also trigger a system event
           this.queueEvent({
             id: randomUUID(),
             type: 'system',
             theme: 'scenario',
             intensity: 1.0,
             description: `Scenario triggered: ${def.name}`,
           });
        }
      } catch (e) {
        console.error(`Error evaluating scenario ${def.id}:`, e);
      }
    }
  }

  private async refreshNarrative(recent: NarrativeEvent[]): Promise<void> {
    const narration: NarrativeNarration = await this.generator.generate(
      this.state,
      recent,
    );
    this.state.narrative = narration;
  }

  private bootstrapEntityState(entity: SimulationEntity): EntityDynamicState {
    return {
      ...entity,
      pressure: 0.2,
      trend: 'stable',
      lastUpdatedTick: 0,
      history: [
        {
          tick: 0,
          sentiment: entity.sentiment,
          influence: entity.influence,
        },
      ],
    };
  }

  private bootstrapParameter(
    name: string,
    value: number,
  ): TimeVariantParameter {
    return {
      name,
      value,
      trend: 'stable',
      history: [
        {
          tick: 0,
          value,
        },
      ],
    };
  }

  private createGenerator(
    mode: NarrativeGeneratorMode | undefined,
    config: SimulationConfig,
  ): NarrativeGenerator {
    if (mode === 'llm' && config.llmClient) {
      return new LLMDrivenNarrativeGenerator(config.llmClient);
    }
    return new RuleBasedNarrativeGenerator();
  }

  private advanceClock(): void {
    this.state.tick += 1;
    this.state.timestamp = new Date(
      this.state.startedAt.getTime() +
        this.state.tick * this.state.tickIntervalMinutes * 60_000,
    );
  }

  private dequeueReadyEvents(): NarrativeEvent[] {
    const ready: NarrativeEvent[] = [];
    for (let index = this.eventQueue.length - 1; index >= 0; index -= 1) {
      const event = this.eventQueue[index];
      if ((event.scheduledTick ?? this.state.tick) <= this.state.tick) {
        ready.push(event);
        this.eventQueue.splice(index, 1);
      }
    }
    return ready.reverse();
  }

  private applyEvent(event: NarrativeEvent): void {
    // Primary application
    if (event.actorId && this.state.entities[event.actorId]) {
      this.adjustEntityState(this.state.entities[event.actorId], event, 1);
    }

    (event.targetIds ?? []).forEach((targetId) => {
      const target = this.state.entities[targetId];
      if (target) {
        this.adjustEntityState(target, event, 0.8);
      }
    });

    // Parameter adjustments
    if (event.parameterAdjustments?.length) {
      event.parameterAdjustments.forEach((param) => {
        const existing =
          this.state.parameters[param.name] ??
          this.bootstrapParameter(param.name, 0);
        existing.value += param.delta;
        existing.history.push({ tick: this.state.tick, value: existing.value });
        existing.trend = this.calculateTrend(existing.history);
        this.state.parameters[param.name] = existing;
      });
    }

    // Propagation (Multi-agent influence)
    if (event.actorId) {
      const actor = this.state.entities[event.actorId];
      if (actor) {
        actor.relationships.forEach((edge) => {
          const related = this.state.entities[edge.targetId];
          if (!related) return;

          // Enhanced propagation logic
          const decay = 0.5;
          const propagatedIntensity = event.intensity * edge.strength * decay;

          if (propagatedIntensity > 0.1) { // Threshold to prevent infinite ripple of tiny events
             const propagatedEvent: NarrativeEvent = {
               ...event,
               id: `${event.id}:${edge.targetId}`,
               actorId: related.id,
               targetIds: [], // Don't propagate further targeting from here automatically to avoid loops in this simple model
               intensity: propagatedIntensity,
               sentimentShift: (event.sentimentShift ?? 0) * edge.strength * related.resilience,
               influenceShift: (event.influenceShift ?? 0) * edge.strength * 0.5,
               description: `(Ripple) ${event.description}`,
             };
             // Add to recentEvents to ensure it is detectable in tests/history
             this.state.recentEvents.push(propagatedEvent);
             this.adjustEntityState(related, propagatedEvent, edge.strength * decay);
          }
        });
      }
    }
  }

  private adjustEntityState(
    entity: EntityDynamicState,
    event: NarrativeEvent,
    weight: number,
  ): void {
    const sentimentDelta =
      (event.sentimentShift ?? 0) *
      event.intensity *
      weight *
      (1 - entity.resilience * 0.5);
    const influenceDelta =
      (event.influenceShift ?? 0) * weight * (1 - entity.volatility * 0.5);

    entity.sentiment = this.clamp(entity.sentiment + sentimentDelta, -1, 1);
    entity.influence = this.clamp(entity.influence + influenceDelta, 0, 1.5);
    entity.pressure = this.clamp(
      entity.pressure + Math.abs(sentimentDelta) * 0.5,
      0,
      1,
    );
    entity.trend =
      sentimentDelta > MOMENTUM_SENSITIVITY
        ? 'rising'
        : sentimentDelta < -MOMENTUM_SENSITIVITY
          ? 'falling'
          : 'stable';
    entity.lastEventId = event.id;
    entity.lastUpdatedTick = this.state.tick;
    entity.history.push({
      tick: this.state.tick,
      sentiment: entity.sentiment,
      influence: entity.influence,
    });

    if (entity.history.length > HISTORY_LIMIT) {
      entity.history.splice(0, entity.history.length - HISTORY_LIMIT);
    }
  }

  private computeArcs(): StoryArc[] {
    return this.state.themes.map((theme) => {
      const entityScores = Object.values(this.state.entities).map((entity) => {
        const themeAffinity = entity.themes[theme] ?? 0;
        const normalizedSentiment = (entity.sentiment + 1) / 2;
        return {
          id: entity.id,
          name: entity.name,
          score: normalizedSentiment * entity.influence * themeAffinity,
        };
      });

      entityScores.sort((a, b) => b.score - a.score);
      const momentum = this.clamp(
        entityScores.reduce((total, current) => total + current.score, 0),
        0,
        1,
      );
      const previous =
        this.state.arcs.find((arc) => arc.theme === theme)?.momentum ??
        momentum;
      const delta = momentum - previous;
      const outlook =
        delta > MOMENTUM_SENSITIVITY
          ? 'improving'
          : delta < -MOMENTUM_SENSITIVITY
            ? 'degrading'
            : 'steady';
      const confidence = this.clamp(
        entityScores
          .slice(0, 3)
          .reduce((total, current) => total + current.score, 0),
        0,
        1,
      );

      return {
        theme,
        momentum,
        outlook,
        confidence,
        keyEntities: entityScores.slice(0, 3).map((entry) => entry.name),
        narrative: this.renderArcNarrative(
          theme,
          outlook,
          entityScores.slice(0, 2),
        ),
      };
    });
  }

  private renderArcNarrative(
    theme: string,
    outlook: 'improving' | 'degrading' | 'steady',
    leaders: Array<{ name: string; score: number }>,
  ): string {
    const leadNames = leaders.map((leader) => leader.name).join(', ');
    const outlookText =
      outlook === 'improving'
        ? 'Narrative sentiment trending upward.'
        : outlook === 'degrading'
          ? 'Narrative momentum deteriorating.'
          : 'Narrative pressure stable.';
    return `${theme}: ${outlookText}${leadNames ? ` Key drivers: ${leadNames}.` : ''}`;
  }

  private applyNaturalDynamics(): void {
    Object.values(this.state.entities).forEach((entity) => {
      const decay = (entity.pressure - entity.resilience * 0.3) * 0.05;
      entity.pressure = this.clamp(entity.pressure - decay, 0, 1);
      if (entity.trend === 'stable') {
        const regression = (entity.sentiment - 0) * 0.02;
        entity.sentiment = this.clamp(entity.sentiment - regression, -1, 1);
      }
    });

    Object.values(this.state.parameters).forEach((parameter) => {
      const regression = parameter.value * 0.01;
      parameter.value -= regression;
      parameter.history.push({ tick: this.state.tick, value: parameter.value });
      if (parameter.history.length > HISTORY_LIMIT) {
        parameter.history.splice(0, parameter.history.length - HISTORY_LIMIT);
      }
      parameter.trend = this.calculateTrend(parameter.history);
    });
  }

  private calculateTrend(
    history: Array<{ tick: number; value: number }>,
  ): 'rising' | 'falling' | 'stable' {
    if (history.length < 2) return 'stable';
    const recent = history.slice(-3);
    const deltas = recent
      .slice(1)
      .map((point, index) => point.value - recent[index].value);
    const avgDelta =
      deltas.reduce((total, value) => total + value, 0) / (deltas.length || 1);
    if (avgDelta > MOMENTUM_SENSITIVITY / 2) return 'rising';
    if (avgDelta < -MOMENTUM_SENSITIVITY / 2) return 'falling';
    return 'stable';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
