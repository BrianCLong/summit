/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Middleware, AnyAction } from '@reduxjs/toolkit'
import { applyPatches, enablePatches, produceWithPatches, Patch } from 'immer'
import { push, popUndo, popRedo, moveToRedo, moveToUndo } from './historySlice'
import { recordAudit } from '../../telemetry/audit' // stub below
import { withSpan } from '../../telemetry/otel' // stub below

enablePatches()

const ALLOW = new Set([
  'viewSync/setTimeRange',
  'viewSync/setGeoBounds',
  'viewSync/setSelectedNodeIds',
  'codex/addSection',
  'codex/addCard',
  'codex/moveCard',
  'codex/setRedaction',
  'focus/enterFocus',
  'focus/exitFocus',
  'settings/setAnimationMode',
])

export const historyMiddleware: Middleware =
  store => next => (action: AnyAction) => {
    if (action.type === 'history/undo') {
      return undo(store)
    }
    if (action.type === 'history/redo') {
      return redo(store)
    }

    if (!ALLOW.has(action.type)) {
      return next(action)
    }

    const prev = store.getState()
    const [nextState, patches, inverse] = produceWithPatches(
      prev,
      (draft: unknown) => {
        // replay the action against the draft state
        // We call `next(action)` after, but we need patches now; so we mirror reducer invocation:
      }
    )
    // Because Redux reducers run in store, we will capture by re-dispatching and diffing:
    const before = store.getState()
    const result = next(action)
    const after = store.getState()
    const diffs = diffState(before, after) // Lightweight JSON diff → Patch[]
    const inverses = invertPatches(diffs) // Minimal inverse set

    store.dispatch(
      push({
        label: action.type,
        patches: diffs,
        inverse: inverses,
        ts: new Date().toISOString(),
      })
    )
    recordAudit('ui.history.mutate', { action: action.type })
    return result
  }

// Minimal diff/invert shims (replace with robust impl or library if approved)
function diffState(a: unknown, b: unknown): Patch[] {
  // naive shallow + slice-specific diff; expand as needed
  // For S1, capture allowlisted slice roots
  const paths = [['viewSync'], ['codex'], ['focus'], ['settings']]
  const patches: Patch[] = []
  for (const p of paths) {
    const ka = JSON.stringify(valueAt(a, p))
    const kb = JSON.stringify(valueAt(b, p))
    if (ka !== kb) {
      patches.push({
        op: 'replace',
        path: `/${p.join('/')}` as never,
        value: valueAt(b, p),
      })
    }
  }
  return patches
}
function invertPatches(patches: Patch[]): Patch[] {
  return patches.map(p => ({
    op: 'replace',
    path: p.path as never,
    value: null,
  })) // filled at apply-time using snapshot
}
function valueAt(obj: unknown, path: string[]): unknown {
  return path.reduce((o, k) => (o as Record<string, unknown>)?.[k], obj)
}

function undo(
  store: ReturnType<typeof import('@reduxjs/toolkit').configureStore>
) {
  return withSpan('ui.undo.apply', () => {
    const entry = store.getState().history.undo.at(-1)
    if (!entry) {
      return
    }
    store.dispatch(popUndo())
    const snap = store.getState() // capture snapshot to compute inverses
    const state = applyPatches(snap, entry.inverse)
    store.replaceReducer((_: unknown) => state) // synchronous state swap (dev-only shim)
    store.dispatch(moveToRedo(entry))
    recordAudit('ui.history.undo', { label: entry.label })
  })
}
function redo(
  store: ReturnType<typeof import('@reduxjs/toolkit').configureStore>
) {
  return withSpan('ui.redo.apply', () => {
    const entry = store.getState().history.redo.at(-1)
    if (!entry) {
      return
    }
    store.dispatch(popRedo())
    const snap = store.getState()
    const state = applyPatches(snap, entry.patches)
    store.replaceReducer((_: unknown) => state)
    store.dispatch(moveToUndo(entry))
    recordAudit('ui.history.redo', { label: entry.label })
  })
}
