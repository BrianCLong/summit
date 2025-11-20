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
} from './types.js';
import {
  LLMDrivenNarrativeGenerator,
  NarrativeGenerator,
  RuleBasedNarrativeGenerator,
} from './generators.js';

const HISTORY_LIMIT = 64;
const MOMENTUM_SENSITIVITY = 0.05;

// F-NARRATIVE-SIM-001: Core Engine implementation
export class NarrativeSimulationEngine {
  private state: NarrativeState;
  private generator: NarrativeGenerator;
  private readonly eventQueue: NarrativeEvent[] = [];

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

  queueEvent(event: NarrativeEvent): void {
    const scheduledTick = event.scheduledTick ?? this.state.tick + 1;
    this.eventQueue.push({ ...event, scheduledTick });
  }

  async tick(steps = 1): Promise<NarrativeState> {
    for (let index = 0; index < steps; index += 1) {
      this.advanceClock();
      const ready = this.dequeueReadyEvents();
      ready.forEach((event) => this.applyEvent(event));
      this.state.recentEvents = [...this.state.recentEvents, ...ready].slice(
        -HISTORY_LIMIT,
      );
      this.state.arcs = this.computeArcs();
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

  updateEntityProfile(entity: SimulationEntity): void {
    this.state.entities[entity.id] = {
      ...this.bootstrapEntityState(entity),
      history: this.state.entities[entity.id]?.history ?? [],
    };
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
    if (event.actorId && this.state.entities[event.actorId]) {
      this.adjustEntityState(this.state.entities[event.actorId], event, 1);
    }

    (event.targetIds ?? []).forEach((targetId) => {
      const target = this.state.entities[targetId];
      if (target) {
        this.adjustEntityState(target, event, 0.8);
      }
    });

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

    if (event.actorId) {
      const actor = this.state.entities[event.actorId];
      if (actor) {
        actor.relationships.forEach((edge) => {
          const related = this.state.entities[edge.targetId];
          if (!related) return;
          const propagatedEvent: NarrativeEvent = {
            ...event,
            id: `${event.id}:${edge.targetId}`,
            actorId: related.id,
            targetIds: [],
            intensity: event.intensity * edge.strength * 0.5,
            sentimentShift:
              (event.sentimentShift ?? 0) * edge.strength * related.resilience,
            influenceShift: (event.influenceShift ?? 0) * edge.strength * 0.5,
          };
          this.adjustEntityState(related, propagatedEvent, edge.strength * 0.5);
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
