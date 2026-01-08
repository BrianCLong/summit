import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDefaultPresetFor,
  loadWorkspaceState,
  persistWorkspaceState,
} from './storage'
import type { WorkspacePresetId } from './presets'
import type { WorkspacePanelKey, WorkspacePreset } from './types'

interface WorkspaceContextValue {
  isEnabled: boolean
  activeWorkspace?: WorkspacePreset
  workspaces: WorkspacePreset[]
  switchWorkspace: (
    workspaceId: WorkspacePresetId,
    options?: { applyRoute?: boolean; useDefaultRoute?: boolean }
  ) => void
  updatePanel: (
    panel: WorkspacePanelKey,
    updates: Partial<{ visible: boolean; size: number }>
  ) => void
  resetWorkspace: (workspaceId?: WorkspacePresetId) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

export const WorkspaceContext =
  React.createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [state, setState] = useState(() =>
    loadWorkspaceState(user?.id || 'anonymous', location.pathname)
  )

  const userKey = user?.id || 'anonymous'

  useEffect(() => {
    setState(loadWorkspaceState(userKey, location.pathname))
  }, [userKey, location.pathname])

  useEffect(() => {
    persistWorkspaceState(userKey, state)
  }, [state, userKey])

  useEffect(() => {
    setState(prev => {
      const active = prev.workspaces[prev.activeWorkspaceId]
      if (!active || active.lastRoute === location.pathname) {
        return prev
      }

      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [prev.activeWorkspaceId]: {
            ...active,
            lastRoute: location.pathname,
            lastUpdated: Date.now(),
          },
        },
      }
    })
  }, [location.pathname])

  const activeWorkspace = state.workspaces[state.activeWorkspaceId]

  const switchWorkspace = useCallback<WorkspaceContextValue['switchWorkspace']>(
    (workspaceId, options = {}) => {
      let targetRoute: string | undefined

      setState(prev => {
        const target = prev.workspaces[workspaceId]
        if (!target) return prev

        targetRoute = options.useDefaultRoute
          ? target.defaultRoute
          : target.lastRoute || target.defaultRoute

        return {
          ...prev,
          activeWorkspaceId: workspaceId,
        }
      })

      if (
        options.applyRoute &&
        targetRoute &&
        targetRoute !== location.pathname
      ) {
        navigate(targetRoute)
      }
    },
    [location.pathname, navigate]
  )

  const updatePanel: WorkspaceContextValue['updatePanel'] = useCallback(
    (panel, updates) => {
      setState(prev => {
        const current = prev.workspaces[prev.activeWorkspaceId]
        if (!current) return prev

        return {
          ...prev,
          workspaces: {
            ...prev.workspaces,
            [prev.activeWorkspaceId]: {
              ...current,
              panels: {
                ...current.panels,
                [panel]: {
                  ...current.panels[panel],
                  ...updates,
                },
              },
              lastUpdated: Date.now(),
            },
          },
        }
      })
    },
    []
  )

  const resetWorkspace = useCallback(
    (workspaceId?: WorkspacePresetId) => {
      setState(prev => {
        const targetId = workspaceId || prev.activeWorkspaceId
        const defaultPreset = getDefaultPresetFor(targetId, location.pathname)
        if (!defaultPreset) return prev

        return {
          ...prev,
          workspaces: {
            ...prev.workspaces,
            [targetId]: {
              ...defaultPreset,
              lastUpdated: Date.now(),
            },
          },
          activeWorkspaceId: targetId,
        }
      })
    },
    [location.pathname]
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      isEnabled: true,
      activeWorkspace,
      workspaces: Object.values(state.workspaces),
      switchWorkspace,
      updatePanel,
      resetWorkspace,
      settingsOpen,
      setSettingsOpen,
    }),
    [
      activeWorkspace,
      resetWorkspace,
      settingsOpen,
      state.workspaces,
      switchWorkspace,
      updatePanel,
    ]
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspaceLayout = (): WorkspaceContextValue => {
  const context = React.useContext(WorkspaceContext)
  if (!context) {
    return {
      isEnabled: false,
      workspaces: [],
      switchWorkspace: () => {},
      updatePanel: () => {},
      resetWorkspace: () => {},
      settingsOpen: false,
      setSettingsOpen: () => {},
    }
  }
  return context
}
