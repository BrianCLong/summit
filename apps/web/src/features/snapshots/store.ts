import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Snapshot {
  id: string
  name: string
  timestamp: number
  data: Record<string, any>
}

interface SnapshotState {
  snapshots: Snapshot[]
  addSnapshot: (name: string, data: Record<string, any>) => void
  removeSnapshot: (id: string) => void
  renameSnapshot: (id: string, newName: string) => void
  restoreSnapshot: (id: string) => Snapshot | undefined
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      addSnapshot: (name, data) =>
        set((state) => ({
          snapshots: [
            ...state.snapshots,
            {
              id: crypto.randomUUID(),
              name,
              timestamp: Date.now(),
              data,
            },
          ],
        })),
      removeSnapshot: (id) =>
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        })),
      renameSnapshot: (id, newName) =>
        set((state) => ({
          snapshots: state.snapshots.map((s) =>
            s.id === id ? { ...s, name: newName } : s
          ),
        })),
      restoreSnapshot: (id) => get().snapshots.find((s) => s.id === id),
    }),
    {
      name: 'summit-snapshots',
    }
  )
)
