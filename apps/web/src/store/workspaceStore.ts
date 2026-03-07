import { create } from 'zustand'
import { TimeWindow, Granularity, TimezoneMode } from '../types/time-window'
import {
  normalizeWindow,
  createInitialTimeWindow,
} from '../lib/time-window-utils'
import {
  trackGoldenPathStep,
  trackTimeWindowChange,
  trackQueryLatency,
} from '../telemetry/metrics'

export interface Entity {
  id: string
  type: string
  label: string
  lat?: number
  lng?: number
  timestamp?: string
  description?: string
}

export interface Link {
  source: string
  target: string
  value: number
  type: string
}

export interface WorkspaceState {
  selectedEntityIds: string[]
  // Replaced simple [Date, Date] with robust TimeWindow
  timeWindow: TimeWindow

  // Data State
  allEntities: Entity[] // Master dataset
  allLinks: Link[] // Master dataset

  // Filtered State (Derived)
  entities: Entity[]
  links: Link[]

  // Sync State
  isSyncing: boolean
  syncError: string | null

  // Actions
  selectEntity: (id: string) => void
  deselectEntity: (id: string) => void
  clearSelection: () => void

  setTimeWindow: (
    startMs: number,
    endMs: number,
    granularity?: Granularity,
    tzMode?: TimezoneMode,
    source?: string
  ) => void
  retrySync: () => void

  // Internal or Debug Actions
  setGraphData: (entities: Entity[], links: Link[]) => void
}

// Mock Data Generation
const generateMockData = () => {
  const entities: Entity[] = [
    {
      id: '1',
      type: 'Person',
      label: 'John Doe',
      lat: 40.7128,
      lng: -74.006,
      timestamp: '2023-10-26T10:00:00Z',
      description: 'Suspect seen in NY',
    },
    {
      id: '2',
      type: 'Location',
      label: 'Central Park',
      lat: 40.7851,
      lng: -73.9683,
      timestamp: '2023-10-26T12:00:00Z',
      description: 'Meeting point',
    },
    {
      id: '3',
      type: 'Event',
      label: 'Transaction',
      lat: 40.7306,
      lng: -73.9352,
      timestamp: '2023-10-27T09:30:00Z',
      description: 'Large transfer observed',
    },
    {
      id: '4',
      type: 'Organization',
      label: 'Shell Corp',
      lat: 51.5074,
      lng: -0.1278,
      timestamp: '2023-10-25T15:45:00Z',
      description: 'Associated entity',
    },
    {
      id: '5',
      type: 'Person',
      label: 'Jane Smith',
      lat: 34.0522,
      lng: -118.2437,
      timestamp: '2023-10-28T14:20:00Z',
      description: 'Contact of John Doe',
    },
  ]

  const links: Link[] = [
    { source: '1', target: '2', value: 5, type: 'visited' },
    { source: '1', target: '3', value: 3, type: 'performed' },
    { source: '3', target: '4', value: 8, type: 'involved' },
    { source: '1', target: '5', value: 2, type: 'knows' },
  ]

  return { entities, links }
}

const { entities: initialEntities, links: initialLinks } = generateMockData()

// Simulated async fetch controller
let currentFetchController: AbortController | null = null

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  selectedEntityIds: [],
  timeWindow: createInitialTimeWindow(),

  allEntities: initialEntities,
  allLinks: initialLinks,

  entities: initialEntities, // Initially show all, or should be filtered? Let's say all for now until filtered.
  links: initialLinks,

  isSyncing: false,
  syncError: null,

  selectEntity: id =>
    set(state => ({
      selectedEntityIds: state.selectedEntityIds.includes(id)
        ? state.selectedEntityIds
        : [...state.selectedEntityIds, id],
    })),

  deselectEntity: id =>
    set(state => ({
      selectedEntityIds: state.selectedEntityIds.filter(eid => eid !== id),
    })),

  clearSelection: () => set({ selectedEntityIds: [] }),

  setTimeWindow: (startMs, endMs, granularity, tzMode, source = 'unknown') => {
    const currentState = get()
    const currentWindow = currentState.timeWindow

    // Default to current values if not provided
    const newGranularity = granularity || currentWindow.granularity
    const newTzMode = tzMode || currentWindow.tzMode
    const newSeq = currentWindow.seq + 1

    // Normalize
    const normalizedWindow = normalizeWindow(
      startMs,
      endMs,
      newGranularity,
      newTzMode,
      newSeq
    )

    // Optimistic update of the window
    set({ timeWindow: normalizedWindow, isSyncing: true, syncError: null })

    // Report change telemetry
    trackTimeWindowChange(
      normalizedWindow.startMs,
      normalizedWindow.endMs,
      normalizedWindow.granularity,
      normalizedWindow.tzMode,
      source
    )

    // Abort previous fetch if in flight (Race-proof: AbortController)
    if (currentFetchController) {
      currentFetchController.abort()
    }
    currentFetchController = new AbortController()
    const signal = currentFetchController.signal

    // Simulate async data fetching/filtering
    // Using a timeout to mimic network latency
    const LATENCY_MS = 300 // > 250ms to trigger Syncing indicator

    const startTime = performance.now()

    setTimeout(() => {
      if (signal.aborted) {
        console.log('Fetch aborted for seq', newSeq)
        return
      }

      try {
        const { allEntities, allLinks } = get()

        // Filter logic
        const filteredEntities = allEntities.filter(e => {
          if (!e.timestamp) return true // Keep entities without timestamp? Or filter them out? Spec says "derive from shared TimeWindow".
          const t = new Date(e.timestamp).getTime()
          return t >= normalizedWindow.startMs && t <= normalizedWindow.endMs
        })

        // Filter links: Keep links where both source and target are in filteredEntities
        const entityIds = new Set(filteredEntities.map(e => e.id))
        const filteredLinks = allLinks.filter(
          l => entityIds.has(l.source) && entityIds.has(l.target)
        )

        set({
          entities: filteredEntities,
          links: filteredLinks,
          isSyncing: false,
          syncError: null,
        })

        // Track Latency
        const duration = performance.now() - startTime
        trackQueryLatency('all', duration)
      } catch (err) {
        if (!signal.aborted) {
          set({ isSyncing: false, syncError: 'Failed to refresh results' })
          // Track error if needed, but for now latency
        }
      }
    }, LATENCY_MS)
  },

  retrySync: () => {
    const { timeWindow, setTimeWindow } = get()
    setTimeWindow(
      timeWindow.startMs,
      timeWindow.endMs,
      timeWindow.granularity,
      timeWindow.tzMode,
      'retry'
    )
  },

  setGraphData: (entities, links) =>
    set({ entities, links, allEntities: entities, allLinks: links }),
}))
