/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { defaultWorkspacePresets, WORKSPACE_STORAGE_VERSION } from './presets'
import type {
  LegacyWorkspaceLayoutV1,
  WorkspacePanelKey,
  WorkspacePreset,
  WorkspaceState,
} from './types'
import type { WorkspacePresetId } from './presets'

const STORAGE_PREFIX = 'intelgraph.workspaces'

const getDefaultWorkspaceState = (
  currentPath: string
): WorkspaceState => {
  const presets: Record<WorkspacePresetId, WorkspacePreset> = {
    investigate: {
      ...defaultWorkspacePresets.investigate,
      lastRoute: currentPath || defaultWorkspacePresets.investigate.defaultRoute,
      lastUpdated: Date.now(),
    },
    review: { ...defaultWorkspacePresets.review },
    briefing: { ...defaultWorkspacePresets.briefing },
  }

  return {
    version: WORKSPACE_STORAGE_VERSION,
    activeWorkspaceId: 'investigate',
    workspaces: presets,
  }
}

const ensurePanelCoverage = (
  panels: WorkspacePreset['panels'],
  presetId: WorkspacePresetId = 'investigate'
): WorkspacePreset['panels'] => {
  const defaultPanels = defaultWorkspacePresets[presetId].panels;
  const merged = { ...panels };
  (Object.keys(defaultPanels) as WorkspacePanelKey[]).forEach(
    panelKey => {
      merged[panelKey] = {
        ...defaultPanels[panelKey],
        ...(panels[panelKey] || {}),
      }
    }
  )
  return merged
}

const migrateFromV1 = (
  raw: LegacyWorkspaceLayoutV1,
  currentPath: string
): WorkspaceState => {
  const base = getDefaultWorkspaceState(currentPath)
  const activeWorkspaceId =
    raw.activeWorkspaceId && base.workspaces[raw.activeWorkspaceId]
      ? raw.activeWorkspaceId
      : base.activeWorkspaceId

  const workspaces = { ...base.workspaces }
  Object.entries(raw.layouts || {}).forEach(([id, layout]) => {
    if (!workspaces[id as WorkspacePresetId]) {
      return
    }

    workspaces[id as WorkspacePresetId] = {
      ...workspaces[id as WorkspacePresetId],
      panels: layout?.panels
        ? ensurePanelCoverage(layout.panels as WorkspacePreset['panels'], id as WorkspacePresetId)
        : workspaces[id as WorkspacePresetId].panels,
      defaultRoute:
        layout?.defaultRoute ||
        workspaces[id as WorkspacePresetId].defaultRoute,
      lastUpdated: Date.now(),
    }
  })

  return {
    version: WORKSPACE_STORAGE_VERSION,
    activeWorkspaceId,
    workspaces,
  }
}

export const migrateWorkspaceState = (
  raw: unknown,
  currentPath: string
): WorkspaceState => {
  if (!raw || typeof raw !== 'object') {
    return getDefaultWorkspaceState(currentPath)
  }

  const parsed = raw as Partial<WorkspaceState> & { version?: number }

  if (parsed.version === WORKSPACE_STORAGE_VERSION && parsed.workspaces) {
    const workspaces = Object.entries(parsed.workspaces).reduce<
      WorkspaceState['workspaces']
    >((acc, [id, workspace]) => {
      const presetId = id as WorkspacePresetId
      const preset = workspace || defaultWorkspacePresets[presetId]
      if (!preset) return acc

      acc[presetId] = {
        ...defaultWorkspacePresets[presetId],
        ...preset,
        panels: ensurePanelCoverage(preset.panels, presetId),
        lastUpdated: preset.lastUpdated || Date.now(),
        lastRoute:
          preset.lastRoute ||
          preset.defaultRoute ||
          defaultWorkspacePresets[presetId].defaultRoute,
      }
      return acc
    }, {} as WorkspaceState['workspaces'])

    const activeWorkspaceId =
      parsed.activeWorkspaceId && workspaces[parsed.activeWorkspaceId]
        ? parsed.activeWorkspaceId
        : 'investigate'

    return {
      version: WORKSPACE_STORAGE_VERSION,
      activeWorkspaceId,
      workspaces,
    }
  }

  if (!parsed.version) {
    return migrateFromV1(raw as LegacyWorkspaceLayoutV1, currentPath)
  }

  if ((parsed.version || 0) < WORKSPACE_STORAGE_VERSION) {
    const downgraded = {
      activeWorkspaceId:
        parsed.activeWorkspaceId || 'investigate',
      layouts: (parsed as unknown as LegacyWorkspaceLayoutV1).layouts || {},
    }
    return migrateFromV1(downgraded, currentPath)
  }

  return getDefaultWorkspaceState(currentPath)
}

export const loadWorkspaceState = (
  userKey: string,
  currentPath: string
): WorkspaceState => {
  if (typeof localStorage === 'undefined') {
    return getDefaultWorkspaceState(currentPath)
  }

  const storageKey = `${STORAGE_PREFIX}.${userKey}`
  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return getDefaultWorkspaceState(currentPath)
  }

  try {
    const parsed = JSON.parse(raw)
    return migrateWorkspaceState(parsed, currentPath)
  } catch (error) {
    console.warn('Failed to parse workspace layout state, resetting.', error)
    return getDefaultWorkspaceState(currentPath)
  }
}

export const persistWorkspaceState = (
  userKey: string,
  state: WorkspaceState
) => {
  if (typeof localStorage === 'undefined') {
    return
  }
  const storageKey = `${STORAGE_PREFIX}.${userKey}`
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...state,
      version: WORKSPACE_STORAGE_VERSION,
    })
  )
}

export const getDefaultPresetFor = (
  workspaceId: WorkspacePresetId,
  currentPath: string
): WorkspacePreset => {
  const base = getDefaultWorkspaceState(currentPath)
  return base.workspaces[workspaceId]
}
