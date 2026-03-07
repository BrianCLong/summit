/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'
import type {
  Annotation,
  AnnotationContext,
  AnnotationState,
  AnnotationTargetRef,
  AnnotationType,
} from './types'

const STORAGE_KEY = 'annotations.draft'

const loadDraftFromStorage = (): Annotation | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Annotation
    if (!parsed.body) return undefined
    return parsed
  } catch {
    return undefined
  }
}

const saveDraftToStorage = (draft?: Annotation) => {
  if (!draft || !draft.body) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export const getInitialAnnotationState = (): AnnotationState => ({
  annotations: [],
  activeDraft: undefined,
  selectedId: undefined,
  restoreCandidate: loadDraftFromStorage() ?? null,
})

const annotateTarget = (
  context?: AnnotationContext
): AnnotationTargetRef | undefined => {
  if (context?.timelineEvent) {
    return {
      kind: 'event',
      id: context.timelineEvent.id,
      label: context.timelineEvent.title ?? 'Timeline event',
    }
  }
  if (context?.entity) {
    return {
      kind: 'entity',
      id: context.entity.id,
      label: context.entity.name,
    }
  }
  if (context?.location) {
    return {
      kind: 'location',
      id: context.location.id,
      label: context.location.location.name ?? 'Location',
    }
  }
  return undefined
}

const slice = createSlice({
  name: 'annotations',
  initialState: getInitialAnnotationState(),
  reducers: {
    startDraft(
      state,
      action: PayloadAction<{
        type?: AnnotationType
        context?: AnnotationContext
      }>
    ) {
      const now = new Date().toISOString()
      state.activeDraft = {
        id: nanoid(),
        type: action.payload.type ?? 'note',
        targetRef: annotateTarget(action.payload.context),
        body: '',
        createdAt: now,
        updatedAt: now,
        status: 'draft',
      }
      state.restoreCandidate = null
      saveDraftToStorage(state.activeDraft)
    },
    updateDraft(state, action: PayloadAction<{ body: string }>) {
      if (!state.activeDraft) return
      state.activeDraft.body = action.payload.body
      state.activeDraft.updatedAt = new Date().toISOString()
      state.activeDraft.status = 'draft'
      saveDraftToStorage(state.activeDraft)
    },
    setDraftTarget(
      state,
      action: PayloadAction<AnnotationTargetRef | undefined>
    ) {
      if (!state.activeDraft) return
      state.activeDraft.targetRef = action.payload
      state.activeDraft.updatedAt = new Date().toISOString()
      saveDraftToStorage(state.activeDraft)
    },
    setDraftType(state, action: PayloadAction<AnnotationType>) {
      if (!state.activeDraft) return
      state.activeDraft.type = action.payload
      state.activeDraft.updatedAt = new Date().toISOString()
      saveDraftToStorage(state.activeDraft)
    },
    clearDraft(state) {
      state.activeDraft = undefined
      state.restoreCandidate = null
      saveDraftToStorage(undefined)
    },
    saveDraft(state) {
      if (!state.activeDraft || !state.activeDraft.body.trim()) return
      const now = new Date().toISOString()
      const annotation: Annotation = {
        ...state.activeDraft,
        createdAt: state.activeDraft.createdAt || now,
        updatedAt: now,
        status: 'unsynced',
      }
      state.annotations.unshift(annotation)
      state.selectedId = annotation.id
      state.activeDraft = undefined
      state.restoreCandidate = null
      saveDraftToStorage(undefined)
    },
    updateAnnotation(
      state,
      action: PayloadAction<{
        id: string
        body?: string
        targetRef?: AnnotationTargetRef
      }>
    ) {
      const annotation = state.annotations.find(a => a.id === action.payload.id)
      if (!annotation) return
      annotation.updatedAt = new Date().toISOString()
      annotation.status = 'unsynced'
      if (typeof action.payload.body === 'string') {
        annotation.body = action.payload.body
      }
      if (action.payload.targetRef) {
        annotation.targetRef = action.payload.targetRef
      }
    },
    selectAnnotation(state, action: PayloadAction<string | undefined>) {
      state.selectedId = action.payload
    },
    restoreDraft(state) {
      if (state.restoreCandidate) {
        state.activeDraft = {
          ...state.restoreCandidate,
          status: 'draft',
          updatedAt: new Date().toISOString(),
        }
      }
      state.restoreCandidate = null
    },
    discardRestoreCandidate(state) {
      state.restoreCandidate = null
      saveDraftToStorage(undefined)
    },
  },
})

export const {
  startDraft,
  updateDraft,
  setDraftTarget,
  clearDraft,
  saveDraft,
  updateAnnotation,
  selectAnnotation,
  restoreDraft,
  discardRestoreCandidate,
  setDraftType,
} = slice.actions
export default slice.reducer
