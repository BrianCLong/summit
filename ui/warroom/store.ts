/**
 * Summit War Room — Zustand Store
 *
 * Central state management for the War Room operational interface.
 */

import { create } from 'zustand';
import type {
  PanelId,
  PanelState,
  WorkspaceLayout,
  Investigation,
  GraphEntity,
  GraphRelationship,
  GraphQuery,
  TimelineEvent,
  EvidenceItem,
  Source,
  AgentTask,
  Simulation,
  Collaborator,
  Comment,
  CommandItem,
} from './types';

/* ------------------------------------------------------------------ */
/*  Default panel layout                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_PANELS: PanelState[] = [
  { id: 'graph', visible: true, x: 0, y: 0, w: 8, h: 6 },
  { id: 'timeline', visible: true, x: 0, y: 6, w: 12, h: 3 },
  { id: 'entity-inspector', visible: true, x: 8, y: 0, w: 4, h: 3 },
  { id: 'evidence', visible: true, x: 8, y: 3, w: 4, h: 3 },
  { id: 'query-console', visible: false, x: 0, y: 9, w: 6, h: 3 },
  { id: 'agent-console', visible: false, x: 6, y: 9, w: 6, h: 3 },
  { id: 'simulation', visible: false, x: 0, y: 0, w: 12, h: 9 },
  { id: 'activity-feed', visible: false, x: 0, y: 0, w: 3, h: 9 },
  { id: 'investigation-notes', visible: false, x: 0, y: 0, w: 6, h: 6 },
  { id: 'narrative-builder', visible: false, x: 0, y: 0, w: 6, h: 6 },
];

/* ------------------------------------------------------------------ */
/*  Store interface                                                    */
/* ------------------------------------------------------------------ */

export interface WarRoomState {
  // Theme
  themeMode: 'dark' | 'light';
  toggleTheme: () => void;

  // Panels
  panels: PanelState[];
  togglePanel: (id: PanelId) => void;
  updatePanelLayout: (panels: PanelState[]) => void;
  savedLayouts: WorkspaceLayout[];
  saveLayout: (name: string) => void;
  loadLayout: (id: string) => void;

  // Active investigation
  activeInvestigation: Investigation | null;
  investigations: Investigation[];
  setActiveInvestigation: (inv: Investigation | null) => void;
  addInvestigation: (inv: Investigation) => void;
  updateInvestigation: (id: string, updates: Partial<Investigation>) => void;

  // Graph
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  graphQueries: GraphQuery[];
  setSelectedEntity: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  setEntities: (entities: GraphEntity[]) => void;
  setRelationships: (rels: GraphRelationship[]) => void;
  addGraphQuery: (q: GraphQuery) => void;

  // Timeline
  timelineEvents: TimelineEvent[];
  setTimelineEvents: (events: TimelineEvent[]) => void;
  addTimelineEvent: (event: TimelineEvent) => void;

  // Evidence
  evidence: EvidenceItem[];
  sources: Source[];
  setEvidence: (items: EvidenceItem[]) => void;
  addEvidence: (item: EvidenceItem) => void;
  setSources: (sources: Source[]) => void;

  // Agents
  agentTasks: AgentTask[];
  addAgentTask: (task: AgentTask) => void;
  updateAgentTask: (id: string, updates: Partial<AgentTask>) => void;

  // Simulation
  simulations: Simulation[];
  activeSimulation: Simulation | null;
  setActiveSimulation: (sim: Simulation | null) => void;
  addSimulation: (sim: Simulation) => void;
  updateSimulation: (id: string, updates: Partial<Simulation>) => void;

  // Collaboration
  collaborators: Collaborator[];
  comments: Comment[];
  addComment: (comment: Comment) => void;

  // Command palette
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  commands: CommandItem[];
  registerCommands: (cmds: CommandItem[]) => void;

  // Sidebar
  sidebarOpen: boolean;
  sidebarTab: 'panels' | 'investigations' | 'agents' | 'settings';
  toggleSidebar: () => void;
  setSidebarTab: (tab: WarRoomState['sidebarTab']) => void;

  // Context panel
  contextPanelOpen: boolean;
  toggleContextPanel: () => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useWarRoomStore = create<WarRoomState>((set, get) => ({
  // Theme
  themeMode: 'dark',
  toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })),

  // Panels
  panels: DEFAULT_PANELS,
  togglePanel: (id) =>
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    })),
  updatePanelLayout: (panels) => set({ panels }),
  savedLayouts: [],
  saveLayout: (name) => {
    const { panels, savedLayouts } = get();
    const layout: WorkspaceLayout = {
      id: `layout-${Date.now()}`,
      name,
      panels: [...panels],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ savedLayouts: [...savedLayouts, layout] });
  },
  loadLayout: (id) => {
    const layout = get().savedLayouts.find((l) => l.id === id);
    if (layout) set({ panels: [...layout.panels] });
  },

  // Active investigation
  activeInvestigation: null,
  investigations: [],
  setActiveInvestigation: (inv) => set({ activeInvestigation: inv }),
  addInvestigation: (inv) => set((s) => ({ investigations: [...s.investigations, inv] })),
  updateInvestigation: (id, updates) =>
    set((s) => ({
      investigations: s.investigations.map((inv) =>
        inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv,
      ),
    })),

  // Graph
  entities: [],
  relationships: [],
  selectedEntityId: null,
  selectedRelationshipId: null,
  graphQueries: [],
  setSelectedEntity: (id) => set({ selectedEntityId: id }),
  setSelectedRelationship: (id) => set({ selectedRelationshipId: id }),
  setEntities: (entities) => set({ entities }),
  setRelationships: (rels) => set({ relationships: rels }),
  addGraphQuery: (q) => set((s) => ({ graphQueries: [...s.graphQueries, q] })),

  // Timeline
  timelineEvents: [],
  setTimelineEvents: (events) => set({ timelineEvents: events }),
  addTimelineEvent: (event) => set((s) => ({ timelineEvents: [...s.timelineEvents, event] })),

  // Evidence
  evidence: [],
  sources: [],
  setEvidence: (items) => set({ evidence: items }),
  addEvidence: (item) => set((s) => ({ evidence: [...s.evidence, item] })),
  setSources: (sources) => set({ sources }),

  // Agents
  agentTasks: [],
  addAgentTask: (task) => set((s) => ({ agentTasks: [...s.agentTasks, task] })),
  updateAgentTask: (id, updates) =>
    set((s) => ({
      agentTasks: s.agentTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  // Simulation
  simulations: [],
  activeSimulation: null,
  setActiveSimulation: (sim) => set({ activeSimulation: sim }),
  addSimulation: (sim) => set((s) => ({ simulations: [...s.simulations, sim] })),
  updateSimulation: (id, updates) =>
    set((s) => ({
      simulations: s.simulations.map((sim) =>
        sim.id === id ? { ...sim, ...updates, updatedAt: new Date().toISOString() } : sim,
      ),
    })),

  // Collaboration
  collaborators: [],
  comments: [],
  addComment: (comment) => set((s) => ({ comments: [...s.comments, comment] })),

  // Command palette
  commandPaletteOpen: false,
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  commands: [],
  registerCommands: (cmds) => set({ commands: cmds }),

  // Sidebar
  sidebarOpen: true,
  sidebarTab: 'panels',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  // Context panel
  contextPanelOpen: false,
  toggleContextPanel: () => set((s) => ({ contextPanelOpen: !s.contextPanelOpen })),
}));
