import type {
  WorkspacePanelKey,
  WorkspacePreset,
  WorkspacePanelState,
} from './types'

export type WorkspacePresetId = 'investigate' | 'review' | 'briefing'

export const WORKSPACE_STORAGE_VERSION = 2

const basePanels: Record<WorkspacePanelKey, WorkspacePanelState> = {
  graph: { visible: true, size: 6 },
  timeline: { visible: true, size: 3 },
  map: { visible: true, size: 3 },
  queue: { visible: false, size: 3 },
  notes: { visible: false, size: 4 },
}

const clonePanels = (): Record<WorkspacePanelKey, WorkspacePanelState> => ({
  graph: { ...basePanels.graph },
  timeline: { ...basePanels.timeline },
  map: { ...basePanels.map },
  queue: { ...basePanels.queue },
  notes: { ...basePanels.notes },
})

const createPreset = (
  id: WorkspacePresetId,
  label: string,
  description: string,
  defaultRoute: string,
  overrides: Partial<Record<WorkspacePanelKey, Partial<WorkspacePanelState>>>
): WorkspacePreset => {
  const panels = clonePanels()

  Object.entries(overrides).forEach(([panel, value]) => {
    if (!value) return
    panels[panel] = { ...panels[panel], ...value }
  })

  return {
    id,
    label,
    description,
    defaultRoute,
    panels,
    lastRoute: defaultRoute,
    lastUpdated: Date.now(),
  }
}

export const defaultWorkspacePresets: Record<
  WorkspacePresetId,
  WorkspacePreset
> = {
  investigate: createPreset(
    'investigate',
    'Investigate',
    'Graph-forward workspace tuned for discovery.',
    '/analysis/tri-pane',
    {
      graph: { size: 7 },
      timeline: { size: 3, visible: true },
      map: { size: 2 },
    }
  ),
  review: createPreset(
    'review',
    'Review',
    'Queue-heavy workspace for triage and follow-up.',
    '/cases',
    {
      graph: { size: 4 },
      timeline: { size: 4 },
      map: { size: 2 },
      queue: { visible: true, size: 4 },
    }
  ),
  briefing: createPreset(
    'briefing',
    'Briefing',
    'Notes-forward view for exports and briefings.',
    '/reports',
    {
      graph: { size: 4 },
      timeline: { size: 3 },
      map: { visible: false, size: 2 },
      notes: { visible: true, size: 5 },
    }
  ),
}

export const workspacePanelOrder: Array<keyof typeof basePanels> = [
  'timeline',
  'graph',
  'map',
  'queue',
  'notes',
]
