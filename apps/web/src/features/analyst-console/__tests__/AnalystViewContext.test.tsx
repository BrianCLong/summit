/**
 * Tests for AnalystViewContext and hooks
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  AnalystViewProvider,
  useAnalystView,
  useGlobalTimeBrush,
  useSelection,
  useViewFilters,
  createDefaultViewState,
} from '../AnalystViewContext'
import type { AnalystViewState } from '../types'

// Wrapper component for testing hooks
function createWrapper(initialState?: Partial<AnalystViewState>) {
  const state = {
    ...createDefaultViewState(),
    ...initialState,
  }

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AnalystViewProvider initialState={state}>{children}</AnalystViewProvider>
    )
  }
}

describe('AnalystViewContext', () => {
  describe('useAnalystView', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAnalystView())
      }).toThrow('useAnalystView must be used within AnalystViewProvider')

      consoleSpy.mockRestore()
    })

    it('provides initial state', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAnalystView(), { wrapper })

      expect(result.current.state).toBeDefined()
      expect(result.current.state.timeWindow).toBeDefined()
      expect(result.current.state.filters).toBeDefined()
      expect(result.current.state.selection).toBeDefined()
    })

    it('setTimeWindow updates time window', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAnalystView(), { wrapper })

      const newTimeWindow = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-07T00:00:00Z',
      }

      act(() => {
        result.current.setTimeWindow(newTimeWindow)
      })

      expect(result.current.state.timeWindow).toEqual(newTimeWindow)
    })

    it('setFilters merges with existing filters', () => {
      const wrapper = createWrapper({
        filters: {
          entityTypes: ['Person'],
          eventTypes: [],
        },
      })
      const { result } = renderHook(() => useAnalystView(), { wrapper })

      act(() => {
        result.current.setFilters({ eventTypes: ['COMMUNICATION'] })
      })

      expect(result.current.state.filters.entityTypes).toEqual(['Person'])
      expect(result.current.state.filters.eventTypes).toEqual(['COMMUNICATION'])
    })

    it('setSelection updates selection state', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useAnalystView(), { wrapper })

      act(() => {
        result.current.setSelection({
          selectedEntityIds: ['entity-1', 'entity-2'],
        })
      })

      expect(result.current.state.selection.selectedEntityIds).toEqual([
        'entity-1',
        'entity-2',
      ])
    })

    it('resetSelection clears all selections', () => {
      const wrapper = createWrapper({
        selection: {
          selectedEntityIds: ['entity-1'],
          selectedEventIds: ['event-1'],
          selectedLocationIds: ['location-1'],
        },
      })
      const { result } = renderHook(() => useAnalystView(), { wrapper })

      act(() => {
        result.current.resetSelection()
      })

      expect(result.current.state.selection.selectedEntityIds).toEqual([])
      expect(result.current.state.selection.selectedEventIds).toEqual([])
      expect(result.current.state.selection.selectedLocationIds).toEqual([])
    })
  })

  describe('useGlobalTimeBrush', () => {
    it('provides time window and setter', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useGlobalTimeBrush(), { wrapper })

      expect(result.current.timeWindow).toBeDefined()
      expect(typeof result.current.setTimeWindow).toBe('function')
    })

    it('setTimeWindow updates the global time window', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useGlobalTimeBrush(), { wrapper })

      const newWindow = {
        from: '2025-02-01T00:00:00Z',
        to: '2025-02-28T00:00:00Z',
      }

      act(() => {
        result.current.setTimeWindow(newWindow)
      })

      expect(result.current.timeWindow).toEqual(newWindow)
    })
  })

  describe('useSelection', () => {
    it('provides selection state and methods', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSelection(), { wrapper })

      expect(result.current.selection).toBeDefined()
      expect(typeof result.current.selectEntity).toBe('function')
      expect(typeof result.current.deselectEntity).toBe('function')
      expect(typeof result.current.toggleEntitySelection).toBe('function')
      expect(typeof result.current.isEntitySelected).toBe('function')
    })

    it('selectEntity adds entity to selection', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSelection(), { wrapper })

      act(() => {
        result.current.selectEntity('entity-1')
      })

      expect(result.current.selection.selectedEntityIds).toContain('entity-1')
      expect(result.current.isEntitySelected('entity-1')).toBe(true)
    })

    it('deselectEntity removes entity from selection', () => {
      const wrapper = createWrapper({
        selection: {
          selectedEntityIds: ['entity-1', 'entity-2'],
          selectedEventIds: [],
          selectedLocationIds: [],
        },
      })
      const { result } = renderHook(() => useSelection(), { wrapper })

      act(() => {
        result.current.deselectEntity('entity-1')
      })

      expect(result.current.selection.selectedEntityIds).not.toContain('entity-1')
      expect(result.current.selection.selectedEntityIds).toContain('entity-2')
    })

    it('toggleEntitySelection toggles entity selection', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSelection(), { wrapper })

      // Toggle on
      act(() => {
        result.current.toggleEntitySelection('entity-1')
      })
      expect(result.current.isEntitySelected('entity-1')).toBe(true)

      // Toggle off
      act(() => {
        result.current.toggleEntitySelection('entity-1')
      })
      expect(result.current.isEntitySelected('entity-1')).toBe(false)
    })

    it('selectEvent adds event to selection', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSelection(), { wrapper })

      act(() => {
        result.current.selectEvent('event-1')
      })

      expect(result.current.selection.selectedEventIds).toContain('event-1')
      expect(result.current.isEventSelected('event-1')).toBe(true)
    })

    it('selectLocation adds location to selection', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSelection(), { wrapper })

      act(() => {
        result.current.selectLocation('location-1')
      })

      expect(result.current.selection.selectedLocationIds).toContain('location-1')
      expect(result.current.isLocationSelected('location-1')).toBe(true)
    })
  })

  describe('useViewFilters', () => {
    it('provides filters and methods', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useViewFilters(), { wrapper })

      expect(result.current.filters).toBeDefined()
      expect(typeof result.current.setEntityTypeFilter).toBe('function')
      expect(typeof result.current.setEventTypeFilter).toBe('function')
      expect(typeof result.current.setMinConfidence).toBe('function')
    })

    it('setEntityTypeFilter updates entity types', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useViewFilters(), { wrapper })

      act(() => {
        result.current.setEntityTypeFilter(['Person', 'Org'])
      })

      expect(result.current.filters.entityTypes).toEqual(['Person', 'Org'])
    })

    it('setMinConfidence updates confidence threshold', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useViewFilters(), { wrapper })

      act(() => {
        result.current.setMinConfidence(0.8)
      })

      expect(result.current.filters.minConfidence).toBe(0.8)
    })

    it('clearEntityTypeFilter removes entity type filter', () => {
      const wrapper = createWrapper({
        filters: {
          entityTypes: ['Person'],
          eventTypes: [],
        },
      })
      const { result } = renderHook(() => useViewFilters(), { wrapper })

      act(() => {
        result.current.clearEntityTypeFilter()
      })

      expect(result.current.filters.entityTypes).toBeUndefined()
    })
  })

  describe('createDefaultViewState', () => {
    it('creates state with default values', () => {
      const state = createDefaultViewState()

      expect(state.timeWindow.from).toBeDefined()
      expect(state.timeWindow.to).toBeDefined()
      expect(state.filters.entityTypes).toEqual([])
      expect(state.selection.selectedEntityIds).toEqual([])
    })

    it('allows overrides', () => {
      const state = createDefaultViewState({
        filters: {
          entityTypes: ['Person'],
          eventTypes: [],
          locationCountries: [],
          tags: [],
        },
      })

      expect(state.filters.entityTypes).toEqual(['Person'])
    })
  })
})
