import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UIState {
  coverStoryMode: boolean
  invisibleHandMode: boolean
}

const initialState: UIState = {
  coverStoryMode: false,
  invisibleHandMode: false,
}

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleCoverStory(s) {
      s.coverStoryMode = !s.coverStoryMode
    },
    setCoverStory(s, a: PayloadAction<boolean>) {
      s.coverStoryMode = a.payload
    },
    toggleInvisibleHand(s) {
      s.invisibleHandMode = !s.invisibleHandMode
    },
    setInvisibleHand(s, a: PayloadAction<boolean>) {
      s.invisibleHandMode = a.payload
    },
  },
})

export const { toggleCoverStory, setCoverStory, toggleInvisibleHand, setInvisibleHand } = slice.actions
export default slice.reducer
