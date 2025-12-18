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
}

export interface ExplainView {
  focus: string | undefined;
  evidence: EvidenceNode[];
  policyBindings: string[];
  confidenceOpacity: number;
}

export interface PathMetric {
  timestamp: number;
  durationMs: number;
}

type Listener = (state: TriPaneState) => void;

function cloneEvidence(evidence: EvidenceNode[]): EvidenceNode[] {
  return evidence.map((item) => ({
    ...item,
    policies: [...item.policies],
  }));
}

function snapshotState(
  state: TriPaneState,
  includeSavedViews = true,
): TriPaneState {
  const savedViews = includeSavedViews
    ? Object.fromEntries(
        Object.entries(state.savedViews).map(([name, view]) => [
          name,
          snapshotState(view, false),
        ]),
      )
    : {};

  return {
    ...state,
    evidence: cloneEvidence(state.evidence),
    policyBindings: [...state.policyBindings],
    savedViews,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class TriPaneController {
  private state: TriPaneState;
  private readonly listeners: Map<Panel, Set<Listener>> = new Map();
  private readonly metrics: PathMetric[] = [];

  constructor(initialEvidence: EvidenceNode[] = []) {
    this.state = {
      evidence: cloneEvidence(initialEvidence),
      policyBindings: [],
      confidenceOpacity: 1,
      savedViews: {},
    };
  }

  get current(): TriPaneState {
    return snapshotState(this.state);
  }

  on(panel: Panel, listener: Listener): () => void {
    const collection = this.listeners.get(panel) ?? new Set<Listener>();
    collection.add(listener);
    this.listeners.set(panel, collection);
    return () => collection.delete(listener);
  }

  selectFromGraph(nodeId: string, evidence: EvidenceNode[]): void {
    const nextEvidence = cloneEvidence(evidence);
    this.state.graphSelection = nodeId;
    this.state.mapSelection = nextEvidence[0]?.id;
    this.state.timelineSelection = nextEvidence.at(-1)?.id;
    this.state.evidence = nextEvidence;
    this.state.policyBindings = Array.from(
      new Set(nextEvidence.flatMap((item) => item.policies)),
    );
    this.state.confidenceOpacity = clamp(
      nextEvidence.reduce((acc, item) => acc + item.confidence, 0) /
        Math.max(nextEvidence.length, 1),
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
    const savedView = snapshotState(this.state, false);
    this.state.savedViews = { ...this.state.savedViews, [name]: savedView };
  }

  restoreView(name: string): TriPaneState | undefined {
    const view = this.state.savedViews[name];
    if (!view) {
      return undefined;
    }

    this.state = {
      ...snapshotState(view, false),
      savedViews: { ...this.state.savedViews },
    };
    this.emit('graph');
    this.emit('map');
    this.emit('timeline');
    return this.current;
  }

  explainCurrentView(): ExplainView {
    return {
      focus: this.state.graphSelection,
      evidence: cloneEvidence(this.state.evidence),
      policyBindings: [...this.state.policyBindings],
      confidenceOpacity: this.state.confidenceOpacity,
    };
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
