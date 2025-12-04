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
  activePanel: Panel;
  savedViews: Record<string, TriPaneState>;
}

export interface ExplainView {
  focus: string | undefined;
  evidence: EvidenceNode[];
  policyBindings: string[];
  confidenceOpacity: number;
  activePanel: Panel;
  summary: string;
  policyHighlights: string[];
  navigationTips: string[];
}

export interface PathMetric {
  timestamp: number;
  durationMs: number;
}

export interface TriPaneCommand {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

export interface PaneLayout {
  id: Panel;
  title: string;
  selection?: string;
  linkedTo: Panel[];
  description: string;
}

export interface CommandPaletteState {
  query: string;
  commands: Array<{ id: string; label: string; shortcut?: string }>;
}

export interface TriPaneLayout {
  activePanel: Panel;
  panes: PaneLayout[];
  commandPalette: CommandPaletteState;
  explainPanel: ExplainView;
}

type Listener = (state: TriPaneState) => void;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class TriPaneController {
  private state: TriPaneState;
  private readonly listeners: Map<Panel, Set<Listener>> = new Map();
  private readonly metrics: PathMetric[] = [];
  private readonly commands: Map<string, TriPaneCommand> = new Map();
  private readonly shortcuts: Map<string, string> = new Map();

  constructor(initialEvidence: EvidenceNode[] = []) {
    this.state = {
      evidence: [...initialEvidence],
      policyBindings: [],
      confidenceOpacity: 1,
      activePanel: 'graph',
      savedViews: {},
    };
    this.registerCommand({
      id: 'focus.graph',
      label: 'Focus Graph pane',
      shortcut: 'ctrl+1',
      run: () => this.setActivePanel('graph'),
    });
    this.registerCommand({
      id: 'focus.timeline',
      label: 'Focus Timeline pane',
      shortcut: 'ctrl+2',
      run: () => this.setActivePanel('timeline'),
    });
    this.registerCommand({
      id: 'focus.map',
      label: 'Focus Map pane',
      shortcut: 'ctrl+3',
      run: () => this.setActivePanel('map'),
    });
    this.registerCommand({
      id: 'explain.view',
      label: 'Explain this view',
      shortcut: 'ctrl+/',
      run: () => {
        this.state.savedViews['explain:last'] = this.current;
      },
    });
  }

  get current(): TriPaneState {
    return {
      ...this.state,
      evidence: [...this.state.evidence],
      policyBindings: [...this.state.policyBindings],
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
    this.state.activePanel = 'graph';
    this.emit('graph');
    this.emit('map');
    this.emit('timeline');
  }

  selectFromMap(locationId: string): void {
    this.state.mapSelection = locationId;
    if (!this.state.graphSelection) {
      this.state.graphSelection = locationId;
    }
    this.state.activePanel = 'map';
    this.emit('map');
  }

  selectFromTimeline(eventId: string): void {
    this.state.timelineSelection = eventId;
    this.state.activePanel = 'timeline';
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
    const focus = this.state.graphSelection;
    const summaryParts = [
      `Active pane: ${this.state.activePanel}`,
      focus ? `focused on ${focus}` : 'no primary focus selected',
      `linked evidence: ${this.state.evidence.length}`,
    ];
    const navigationTips = [
      'Ctrl+1 Graph · Ctrl+2 Timeline · Ctrl+3 Map',
      'Ctrl+/ Explain view',
      'Use command palette to jump to saved views',
    ];
    return {
      focus,
      evidence: [...this.state.evidence],
      policyBindings: [...this.state.policyBindings],
      confidenceOpacity: this.state.confidenceOpacity,
      activePanel: this.state.activePanel,
      summary: summaryParts.join(' | '),
      policyHighlights:
        this.state.policyBindings.length > 0
          ? this.state.policyBindings
          : ['No policy bindings detected'],
      navigationTips,
    };
  }

  buildUnifiedLayout(query = ''): TriPaneLayout {
    const panes: PaneLayout[] = [
      {
        id: 'graph',
        title: 'Graph',
        selection: this.state.graphSelection,
        linkedTo: ['timeline', 'map'],
        description: 'Entity graph with policy overlays',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        selection: this.state.timelineSelection,
        linkedTo: ['graph', 'map'],
        description: 'Events and audit chronology',
      },
      {
        id: 'map',
        title: 'Map',
        selection: this.state.mapSelection,
        linkedTo: ['graph', 'timeline'],
        description: 'Geo context and path routing',
      },
    ];
    return {
      activePanel: this.state.activePanel,
      panes,
      commandPalette: this.commandPalette(query),
      explainPanel: this.explainCurrentView(),
    };
  }

  registerCommand(command: TriPaneCommand): void {
    this.commands.set(command.id, command);
    if (command.shortcut) {
      this.shortcuts.set(this.normalizeShortcut(command.shortcut), command.id);
    }
  }

  commandPalette(query = ''): CommandPaletteState {
    const normalized = query.trim().toLowerCase();
    const commands = Array.from(this.commands.values())
      .filter((command) =>
        normalized.length === 0
          ? true
          : command.label.toLowerCase().includes(normalized) ||
            command.id.toLowerCase().includes(normalized),
      )
      .map((command) => ({
        id: command.id,
        label: command.label,
        shortcut: command.shortcut,
      }));
    return { query, commands };
  }

  triggerCommand(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (!command) {
      return false;
    }
    command.run();
    return true;
  }

  handleShortcut(shortcut: string): boolean {
    const commandId = this.shortcuts.get(this.normalizeShortcut(shortcut));
    if (!commandId) {
      return false;
    }
    return this.triggerCommand(commandId);
  }

  private setActivePanel(panel: Panel): void {
    this.state.activePanel = panel;
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut.trim().toLowerCase();
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
