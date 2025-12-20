import type { WorkspacePresetId } from './presets'

export type WorkspacePanelKey = 'graph' | 'timeline' | 'map' | 'queue' | 'notes'

export interface WorkspacePanelState {
  visible: boolean
  size: number
}

export interface WorkspacePreset {
  id: WorkspacePresetId
  label: string
  description: string
  defaultRoute: string
  panels: Record<WorkspacePanelKey, WorkspacePanelState>
  lastRoute?: string
  lastUpdated: number
}

export interface WorkspaceState {
  version: number
  activeWorkspaceId: WorkspacePresetId
  workspaces: Record<WorkspacePresetId, WorkspacePreset>
}

export interface LegacyWorkspaceLayoutV1 {
  activeWorkspaceId: WorkspacePresetId
  layouts: Partial<
    Record<
      WorkspacePresetId,
      {
        panels?: Partial<Record<WorkspacePanelKey, WorkspacePanelState>>
        defaultRoute?: string
      }
    >
  >
}
