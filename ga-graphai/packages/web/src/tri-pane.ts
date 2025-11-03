export type Panel = 'graph' | 'map' | 'timeline';

export interface EvidenceNode {
  id: string;
  label: string;
  confidence: number;
  policies: string[];
}

export interface TriPaneState {
  graphSelection?: string;
  mapSelection?: string;
  timelineSelection?: string;
  evidence: EvidenceNode[];
  policyBindings: string[];
  confidenceOpacity: number;
  savedViews: Record<string, TriPaneState>;
  narrativeDiagnostics?: NarrativeDiagnostics;
}

export interface ExplainView {
  focus: string | undefined;
  evidence: EvidenceNode[];
  policyBindings: string[];
  confidenceOpacity: number;
  narrativeDiagnostics?: NarrativeDiagnostics;
}

export interface PathMetric {
  timestamp: number;
  durationMs: number;
}

export interface NarrativeTelemetry {
  identification: number;
  imitation: number;
  amplification: number;
  emotionalSignals: Record<string, number>;
}

export interface NarrativeDiagnostics extends NarrativeTelemetry {
  emotionalRisk: number;
  volatility: number;
}

type Listener = (state: TriPaneState) => void;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class TriPaneController {
  private state: TriPaneState;
  private readonly listeners: Map<Panel, Set<Listener>> = new Map();
  private readonly metrics: PathMetric[] = [];

  constructor(initialEvidence: EvidenceNode[] = []) {
    this.state = {
      evidence: [...initialEvidence],
      policyBindings: [],
      confidenceOpacity: 1,
      savedViews: {},
      narrativeDiagnostics: undefined,
    };
  }

  get current(): TriPaneState {
    return {
      ...this.state,
      evidence: [...this.state.evidence],
      policyBindings: [...this.state.policyBindings],
      narrativeDiagnostics: this.state.narrativeDiagnostics
        ? { ...this.state.narrativeDiagnostics }
        : undefined,
    };
  }

  on(panel: Panel, listener: Listener): () => void {
    const collection = this.listeners.get(panel) ?? new Set<Listener>();
    collection.add(listener);
    this.listeners.set(panel, collection);
    return () => collection.delete(listener);
  }

  selectFromGraph(nodeId: string, evidence: EvidenceNode[]): void {
    this.state.graphSelection = nodeId;
    this.state.mapSelection = evidence[0]?.id;
    this.state.timelineSelection = evidence.at(-1)?.id;
    this.state.evidence = evidence;
    this.state.policyBindings = Array.from(
      new Set(evidence.flatMap((item) => item.policies)),
    );
    this.state.confidenceOpacity = clamp(
      evidence.reduce((acc, item) => acc + item.confidence, 0) /
        Math.max(evidence.length, 1),
      0,
      1,
    );
    this.emit('graph');
    this.emit('map');
    this.emit('timeline');
  }

  selectFromMap(locationId: string): void {
    this.state.mapSelection = locationId;
    if (!this.state.graphSelection) {
      this.state.graphSelection = locationId;
    }
    this.emit('map');
  }

  selectFromTimeline(eventId: string): void {
    this.state.timelineSelection = eventId;
    this.emit('timeline');
  }

  recordPathDiscovery(durationMs: number): void {
    this.metrics.push({ timestamp: Date.now(), durationMs });
  }

  averageTimeToPath(): number {
    if (this.metrics.length === 0) {
      return 0;
    }
    const total = this.metrics.reduce(
      (sum, metric) => sum + metric.durationMs,
      0,
    );
    return Math.round(total / this.metrics.length);
  }

  saveView(name: string): void {
    this.state.savedViews[name] = this.current;
  }

  restoreView(name: string): TriPaneState | undefined {
    const view = this.state.savedViews[name];
    if (view) {
      this.state = {
        ...view,
        evidence: [...view.evidence],
        policyBindings: [...view.policyBindings],
        savedViews: { ...this.state.savedViews },
      };
      this.emit('graph');
      this.emit('map');
      this.emit('timeline');
      return this.current;
    }
    return undefined;
  }

  explainCurrentView(): ExplainView {
    return {
      focus: this.state.graphSelection,
      evidence: [...this.state.evidence],
      policyBindings: [...this.state.policyBindings],
      confidenceOpacity: this.state.confidenceOpacity,
      narrativeDiagnostics: this.state.narrativeDiagnostics
        ? { ...this.state.narrativeDiagnostics }
        : undefined,
    };
  }

  ingestNarrativeTelemetry(samples: NarrativeTelemetry[]): NarrativeDiagnostics {
    if (!samples.length) {
      const diagnostics: NarrativeDiagnostics = {
        identification: 0,
        imitation: 0,
        amplification: 0,
        emotionalSignals: {},
        emotionalRisk: 0,
        volatility: 0,
      };
      this.state.narrativeDiagnostics = diagnostics;
      this.emit('graph');
      return diagnostics;
    }

    const aggregate = samples.reduce(
      (acc, sample) => {
        acc.identification += sample.identification;
        acc.imitation += sample.imitation;
        acc.amplification += sample.amplification;
        for (const [key, value] of Object.entries(sample.emotionalSignals)) {
          acc.emotionalSignals[key] =
            (acc.emotionalSignals[key] ?? 0) + value;
        }
        return acc;
      },
      {
        identification: 0,
        imitation: 0,
        amplification: 0,
        emotionalSignals: {} as Record<string, number>,
      },
    );

    const normalisedSignals: Record<string, number> = {};
    for (const [key, value] of Object.entries(aggregate.emotionalSignals)) {
      normalisedSignals[key] = Number(
        (value / samples.length).toFixed(4),
      );
    }

    const identification = Number(
      (aggregate.identification / samples.length).toFixed(4),
    );
    const imitation = Number(
      (aggregate.imitation / samples.length).toFixed(4),
    );
    const amplification = Number(
      (aggregate.amplification / samples.length).toFixed(4),
    );

    const deltas = samples.map((sample) => {
      const diff =
        Math.abs(sample.identification - identification) +
        Math.abs(sample.imitation - imitation) +
        Math.abs(sample.amplification - amplification);
      return diff / 3;
    });
    const volatility = Number(
      (deltas.reduce((acc, value) => acc + value, 0) / samples.length).toFixed(4),
    );

    const emotionalRisk = computeEmotionalRisk(normalisedSignals);

    const diagnostics: NarrativeDiagnostics = {
      identification,
      imitation,
      amplification,
      emotionalSignals: normalisedSignals,
      emotionalRisk,
      volatility,
    };

    this.state.narrativeDiagnostics = diagnostics;
    this.emit('graph');
    return diagnostics;
  }

  getNarrativeDiagnostics(): NarrativeDiagnostics | undefined {
    return this.state.narrativeDiagnostics
      ? { ...this.state.narrativeDiagnostics }
      : undefined;
  }

  private emit(panel: Panel): void {
    const listeners = this.listeners.get(panel);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(this.current);
    }
  }
}

function computeEmotionalRisk(signals: Record<string, number>): number {
  const fear = signals.fear ?? 0;
  const anger = signals.anger ?? 0;
  const uncertainty = signals.uncertainty ?? 0;
  const hope = signals.hope ?? 0;
  const trust = signals.trust ?? 0;
  const raw = fear * 0.6 + anger * 0.6 + uncertainty * 0.4 - (hope + trust) * 0.3;
  return clamp(Number(raw.toFixed(4)), 0, 1);
}
