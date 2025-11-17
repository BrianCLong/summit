// TODO: Remove jQuery dependency - migrate to React event system
// import $ from 'jquery'
import { AppDispatch } from '../store'
import { open, setPolicy } from '../features/explain/explainSlice'

export function attachHistoryExplainBridge(
  $root: any, // JQuery
  dispatch: AppDispatch
) {
  // TODO: Replace with React-based event system
  // $root.on('intelgraph:explain:open', (_e, policy) => {
  //   dispatch(setPolicy(policy || []))
  //   dispatch(open())
  // })
  // $root.on('intelgraph:history:apply', (_e, payload) => {
  //   /* optional hooks for panes */
  // })
}
