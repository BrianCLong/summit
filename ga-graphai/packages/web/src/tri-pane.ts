export type Panel = "graph" | "map" | "timeline";

export interface EvidenceNode {
  id: string;
  label: string;
  confidence: number;
  policies: string[];
  time?: number;
  validFrom?: number;
  validTo?: number;
}

export interface TimeWindow {
  start: number;
  end: number;
  timezone?: string;
}

export interface TriPaneState {
  graphSelection?: string;
  mapSelection?: string;
  timelineSelection?: string;
  timeWindow?: TimeWindow;
  evidenceSource: EvidenceNode[];
  evidence: EvidenceNode[];
  policyBindings: string[];
  confidenceOpacity: number;
  savedViews: Record<string, TriPaneState>;
  activePanel: Panel;
}

export interface ExplainView {
  focus: string | undefined;
  evidence: EvidenceNode[];
  policyBindings: string[];
  confidenceOpacity: number;
  activePanel: Panel;
  policyHighlights: string[];
  navigationTips: string[];
  timeWindow?: TimeWindow;
}

export interface PathMetric {
  timestamp: number;
  durationMs: number;
}

type Listener = (state: TriPaneState) => void;

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

export interface TriPaneContext {
  tenantId?: string;
  caseId?: string;
}

function cloneEvidence(evidence: EvidenceNode[]): EvidenceNode[] {
  return evidence.map((item) => ({
    ...item,
    policies: [...item.policies],
  }));
}

function snapshotState(state: TriPaneState, includeSavedViews = true): TriPaneState {
  const savedViews = includeSavedViews
    ? Object.fromEntries(
        Object.entries(state.savedViews).map(([name, view]) => [name, snapshotState(view, false)])
      )
    : {};

  return {
    ...state,
    timeWindow: state.timeWindow ? { ...state.timeWindow } : undefined,
    evidenceSource: cloneEvidence(state.evidenceSource),
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
  private readonly history: TriPaneState[] = [];
  private readonly future: TriPaneState[] = [];
  private readonly commands: Map<string, Command> = new Map();
  private readonly shortcuts: Map<string, string> = new Map();
  private readonly context?: TriPaneContext;

  constructor(initialEvidence: EvidenceNode[] = [], context?: TriPaneContext) {
    this.context = context;
    this.state = {
      evidenceSource: cloneEvidence(initialEvidence),
      evidence: cloneEvidence(initialEvidence),
      policyBindings: [],
      confidenceOpacity: 1,
      savedViews: {},
      activePanel: "graph",
    };

    this.registerCommand({
      id: "focus.graph",
      label: "Focus graph",
      shortcut: "ctrl+1",
      run: () => this.setActivePanel("graph"),
    });
    this.registerCommand({
      id: "focus.timeline",
      label: "Focus timeline",
      shortcut: "ctrl+2",
      run: () => this.setActivePanel("timeline"),
    });
    this.registerCommand({
      id: "focus.map",
      label: "Focus map",
      shortcut: "ctrl+3",
      run: () => this.setActivePanel("map"),
    });
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
    const clonedEvidence = cloneEvidence(evidence);
    const nextEvidence = this.filterEvidenceByTimeWindow(clonedEvidence);
    this.applyState(
      {
        graphSelection: nodeId,
        mapSelection: nextEvidence[0]?.id,
        timelineSelection: nextEvidence.at(-1)?.id,
        evidenceSource: clonedEvidence,
        evidence: nextEvidence,
        policyBindings: Array.from(new Set(nextEvidence.flatMap((item) => item.policies))),
        confidenceOpacity: clamp(
          nextEvidence.reduce((acc, item) => acc + item.confidence, 0) /
            Math.max(nextEvidence.length, 1),
          0,
          1
        ),
        activePanel: "graph",
      },
      ["graph", "map", "timeline"]
    );
  }

  selectFromMap(locationId: string): void {
    this.applyState(
      {
        mapSelection: locationId,
        graphSelection: this.state.graphSelection ?? locationId,
        activePanel: "map",
      },
      ["map", "graph"]
    );
  }

  selectFromTimeline(eventId: string): void {
    this.applyState(
      {
        timelineSelection: eventId,
        activePanel: "timeline",
      },
      ["timeline"]
    );
  }

  setTimeWindow(timeWindow: TimeWindow): void {
    const orderedWindow: TimeWindow =
      timeWindow.start <= timeWindow.end
        ? timeWindow
        : { ...timeWindow, start: timeWindow.end, end: timeWindow.start };
    const baseEvidence = this.state.evidenceSource.length
      ? cloneEvidence(this.state.evidenceSource)
      : cloneEvidence(this.state.evidence);
    const nextEvidence = this.filterEvidenceByTimeWindow(baseEvidence, orderedWindow);
    const nextPolicyBindings = Array.from(new Set(nextEvidence.flatMap((item) => item.policies)));
    const nextConfidence = clamp(
      nextEvidence.reduce((acc, item) => acc + item.confidence, 0) /
        Math.max(nextEvidence.length, 1),
      0,
      1
    );
    this.applyState(
      {
        timeWindow: { ...orderedWindow },
        evidence: nextEvidence,
        mapSelection: nextEvidence[0]?.id,
        timelineSelection: nextEvidence.at(-1)?.id,
        policyBindings: nextPolicyBindings,
        confidenceOpacity: nextConfidence,
      },
      ["graph", "map", "timeline"]
    );
  }

  recordPathDiscovery(durationMs: number): void {
    this.metrics.push({ timestamp: Date.now(), durationMs });
  }

  averageTimeToPath(): number {
    if (this.metrics.length === 0) {
      return 0;
    }
    const total = this.metrics.reduce((sum, metric) => sum + metric.durationMs, 0);
    return Math.round(total / this.metrics.length);
  }

  saveView(name: string): void {
    const savedView = snapshotState(this.state, false);
    this.applyState({ savedViews: { ...this.state.savedViews, [name]: savedView } }, [], false);
  }

  restoreView(name: string): TriPaneState | undefined {
    const view = this.state.savedViews[name];
    if (!view) {
      return undefined;
    }

    this.state = {
      ...snapshotState(view, false),
      savedViews: { ...this.state.savedViews },
      activePanel: view.activePanel ?? this.state.activePanel,
    };
    this.emit("graph");
    this.emit("map");
    this.emit("timeline");
    return this.current;
  }

  explainCurrentView(): ExplainView {
    return {
      focus: this.state.graphSelection,
      evidence: cloneEvidence(this.state.evidence),
      policyBindings: [...this.state.policyBindings],
      confidenceOpacity: this.state.confidenceOpacity,
      activePanel: this.state.activePanel,
      policyHighlights: [...new Set(this.state.policyBindings)],
      navigationTips: [
        "Ctrl+1 Graph · Ctrl+2 Timeline · Ctrl+3 Map",
        "Arrow keys adjust brush; Shift extends step",
      ],
      timeWindow: this.state.timeWindow ? { ...this.state.timeWindow } : undefined,
    };
  }

  setActivePanel(panel: Panel): void {
    this.applyState({ activePanel: panel }, [panel]);
  }

  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
    if (command.shortcut) {
      this.shortcuts.set(command.shortcut.toLowerCase(), command.id);
    }
  }

  handleShortcut(shortcut: string): boolean {
    const commandId = this.shortcuts.get(shortcut.toLowerCase());
    if (!commandId) {
      return false;
    }
    const command = this.commands.get(commandId);
    command?.run();
    return Boolean(command);
  }

  commandPalette(savedViewName?: string): { commands: Command[] } {
    const viewCommands: Command[] = savedViewName
      ? [
          {
            id: `restore.${savedViewName}`,
            label: `Restore view ${savedViewName}`,
            run: () => this.restoreView(savedViewName),
          },
        ]
      : [];

    const savedViewEntries = Object.keys(this.state.savedViews).map<Command>((name) => ({
      id: `saved.${name}`,
      label: `Open saved view ${name}`,
      run: () => this.restoreView(name),
    }));

    return {
      commands: [...viewCommands, ...Array.from(this.commands.values()), ...savedViewEntries],
    };
  }

  buildUnifiedLayout(activePanel: Panel): {
    activePanel: Panel;
    panes: Array<{ id: Panel; linkedTo: Panel[] }>;
    commandPalette: { commands: Command[] };
    explainPanel: {
      summary: string;
      policyHighlights: string[];
      timeWindow?: TimeWindow;
    };
  } {
    this.setActivePanel(activePanel);
    return {
      activePanel: this.state.activePanel,
      panes: [
        { id: "graph", linkedTo: ["timeline", "map"] },
        { id: "timeline", linkedTo: ["graph", "map"] },
        { id: "map", linkedTo: ["graph", "timeline"] },
      ],
      commandPalette: this.commandPalette(),
      explainPanel: {
        summary: `Active pane: ${this.state.activePanel}`,
        policyHighlights: [...this.state.policyBindings],
        timeWindow: this.state.timeWindow ? { ...this.state.timeWindow } : undefined,
      },
    };
  }

  buildQueryPayload<T extends Record<string, unknown>>(
    base: T
  ): T & {
    timeWindow?: TimeWindow;
    tenantId?: string;
    caseId?: string;
  } {
    return {
      ...base,
      ...(this.state.timeWindow ? { timeWindow: { ...this.state.timeWindow } } : {}),
      ...(this.context?.tenantId ? { tenantId: this.context.tenantId } : {}),
      ...(this.context?.caseId ? { caseId: this.context.caseId } : {}),
    };
  }

  buildQueryKey(baseKey: string): string {
    const timeComponent = this.state.timeWindow
      ? `${this.state.timeWindow.start}-${this.state.timeWindow.end}`
      : "no-window";
    const timezoneComponent = this.state.timeWindow?.timezone ?? "tz-undefined";
    const tenantComponent = this.context?.tenantId ?? "tenant";
    const caseComponent = this.context?.caseId ?? "case";
    return [tenantComponent, caseComponent, baseKey, timeComponent, timezoneComponent].join("::");
  }

  undo(): TriPaneState {
    const previous = this.history.pop();
    if (!previous) {
      return this.current;
    }
    this.future.push(snapshotState(this.state));
    this.state = snapshotState(previous, false);
    this.emit("graph");
    this.emit("map");
    this.emit("timeline");
    return this.current;
  }

  redo(): TriPaneState {
    const next = this.future.pop();
    if (!next) {
      return this.current;
    }
    this.history.push(snapshotState(this.state));
    this.state = snapshotState(next, false);
    this.emit("graph");
    this.emit("map");
    this.emit("timeline");
    return this.current;
  }

  getTimeBrushHandles(stepMs = 60 * 60 * 1000): {
    startHandle: Record<string, unknown>;
    endHandle: Record<string, unknown>;
    liveRegion: () => string;
  } {
    const announce = () =>
      this.state.timeWindow ? this.describeWindow(this.state.timeWindow) : "No time window set";

    const adjust = (which: "start" | "end", delta: number) => {
      if (!this.state.timeWindow) {
        return;
      }
      const next: TimeWindow = {
        ...this.state.timeWindow,
        [which]: this.state.timeWindow[which] + delta,
      } as TimeWindow;
      this.setTimeWindow(next);
    };

    const handleKeyDown =
      (which: "start" | "end") =>
      (event: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => {
        const multiplier = event.shiftKey ? 24 : 1;
        if (event.key === "ArrowLeft") {
          adjust(which, -stepMs * multiplier);
          event.preventDefault?.();
        }
        if (event.key === "ArrowRight") {
          adjust(which, stepMs * multiplier);
          event.preventDefault?.();
        }
      };

    return {
      startHandle: {
        role: "slider",
        tabIndex: 0,
        "aria-label": "Time brush start",
        onKeyDown: handleKeyDown("start"),
      },
      endHandle: {
        role: "slider",
        tabIndex: 0,
        "aria-label": "Time brush end",
        onKeyDown: handleKeyDown("end"),
      },
      liveRegion: announce,
    };
  }

  private describeWindow(window: TimeWindow): string {
    const start = new Date(window.start).toISOString();
    const end = new Date(window.end).toISOString();
    return `Time window ${start} to ${end}`;
  }

  private filterEvidenceByTimeWindow(
    evidence: EvidenceNode[],
    window: TimeWindow | undefined = this.state.timeWindow
  ): EvidenceNode[] {
    if (!window) {
      return evidence;
    }
    const { start, end } = window;
    return evidence.filter((item) => {
      const startValue = item.validFrom ?? item.time;
      const endValue = item.validTo ?? item.validFrom ?? item.time;
      const windowStart = startValue ?? 0;
      const windowEnd = endValue ?? windowStart;
      return windowStart >= start && windowEnd <= end;
    });
  }

  private applyState(
    partial: Partial<TriPaneState>,
    emitPanels: Panel[],
    recordHistory = true
  ): void {
    if (recordHistory) {
      this.history.push(snapshotState(this.state));
      this.future.length = 0;
    }
    this.state = {
      ...this.state,
      ...partial,
    };
    for (const panel of emitPanels) {
      this.emit(panel);
    }
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
