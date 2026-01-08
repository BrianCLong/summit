import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Patch } from 'immer'

export interface HistoryEntry {
  label: string // e.g., "codex:addCard"
  inverse: Patch[] // to undo
  patches: Patch[] // to redo
  ts: string
}
export interface HistoryState {
  undo: HistoryEntry[]
  redo: HistoryEntry[]
  cap: number
}
const initial: HistoryState = { undo: [], redo: [], cap: 200 }

const slice = createSlice({
  name: 'history',
  initialState: initial,
  reducers: {
    push(s, a: PayloadAction<HistoryEntry>) {
      s.undo.push(a.payload)
      if (s.undo.length > s.cap) {
        s.undo.shift()
      }
      s.redo = []
    },
    clear(s) {
      s.undo = []
      s.redo = []
    },
    moveToRedo(s, a: PayloadAction<HistoryEntry>) {
      s.redo.push(a.payload)
    },
    moveToUndo(s, a: PayloadAction<HistoryEntry>) {
      s.undo.push(a.payload)
    },
    popUndo(s) {
      s.undo.pop()
    },
    popRedo(s) {
      s.redo.pop()
    },
  },
})
export const { push, clear, moveToRedo, moveToUndo, popUndo, popRedo } =
  slice.actions
export default slice.reducer
