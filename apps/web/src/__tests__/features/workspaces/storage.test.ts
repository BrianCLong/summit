import { beforeEach, describe, expect, it } from 'vitest'
import {
  getDefaultPresetFor,
  loadWorkspaceState,
  migrateWorkspaceState,
  persistWorkspaceState,
} from '@/features/workspaces/storage'
import { WORKSPACE_STORAGE_VERSION } from '@/features/workspaces/presets'

describe('workspace layout persistence', () => {
  const userKey = 'user-1'

  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default state when storage is empty', () => {
    const state = loadWorkspaceState(userKey, '/current')

    expect(state.version).toBe(WORKSPACE_STORAGE_VERSION)
    expect(state.activeWorkspaceId).toBe('investigate')
    expect(state.workspaces.investigate.lastRoute).toBe('/current')
  })

  it('migrates legacy v1 layouts and preserves active workspace', () => {
    const legacy = {
      activeWorkspaceId: 'review',
      layouts: {
        review: {
          panels: {
            graph: { visible: true, size: 5 },
            timeline: { visible: true, size: 4 },
          },
          defaultRoute: '/cases/review',
        },
      },
    }

    localStorage.setItem(
      `intelgraph.workspaces.${userKey}`,
      JSON.stringify(legacy)
    )

    const migrated = loadWorkspaceState(userKey, '/current')

    expect(migrated.version).toBe(WORKSPACE_STORAGE_VERSION)
    expect(migrated.activeWorkspaceId).toBe('review')
    expect(migrated.workspaces.review.panels.graph.size).toBe(5)
    expect(migrated.workspaces.review.defaultRoute).toBe('/cases/review')
  })

  it('persists layouts per user key', () => {
    const state = loadWorkspaceState(userKey, '/tri-pane')
    persistWorkspaceState(userKey, {
      ...state,
      activeWorkspaceId: 'briefing',
    })

    const otherUserState = loadWorkspaceState('user-2', '/tri-pane')
    expect(otherUserState.activeWorkspaceId).toBe('investigate')
  })

  it('fills missing panels with defaults during migration', () => {
    const defaultPreset = getDefaultPresetFor('briefing', '/reports')
    const migrated = migrateWorkspaceState(
      {
        version: WORKSPACE_STORAGE_VERSION,
        activeWorkspaceId: 'briefing',
        workspaces: {
          briefing: {
            ...defaultPreset,
            panels: {
              graph: { visible: true, size: 2 },
            },
          },
        },
      },
      '/reports'
    )

    expect(migrated.workspaces.briefing.panels.map.visible).toBe(false)
    expect(migrated.workspaces.briefing.panels.timeline.visible).toBe(true)
  })
})
