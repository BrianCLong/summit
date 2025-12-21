import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createSelector } from '@reduxjs/toolkit'
// TODO: viewSync feature was removed - restore if needed
// import { selectActiveQuery } from '../viewSync/viewSyncSlice'

export interface PolicyItem {
  id: string
  message: string
  severity: 'info' | 'warn' | 'block'
}
export interface ExplainState {
  open: boolean
  policy: PolicyItem[]
}

const initial: ExplainState = { open: true, policy: [] }
const slice = createSlice({
  name: 'explain',
  initialState: initial,
  reducers: {
    open: s => {
      s.open = true
    },
    close: s => {
      s.open = false
    },
    setPolicy: (s, a: PayloadAction<PolicyItem[]>) => {
      s.policy = a.payload
    },
  },
})
export const { open, close, setPolicy } = slice.actions
export default slice.reducer

export const selectExplain = (st: { explain: ExplainState }) => st.explain
// TODO: Re-enable when viewSync feature is restored
// export const selectExplainModel = createSelector(
//   [selectActiveQuery, selectExplain],
//   (query, expl) => ({ query, policy: expl.policy })
// )
