import reducer, {
  startDraft,
  updateDraft,
  saveDraft,
  selectAnnotation,
  restoreDraft,
  discardRestoreCandidate,
  setDraftType,
  getInitialAnnotationState,
} from './annotationsSlice'
import type { AnnotationState } from './types'

describe('annotationsSlice', () => {
  const baseState: AnnotationState = getInitialAnnotationState()

  it('starts a draft with defaults', () => {
    const state = reducer(baseState, startDraft({ type: 'note' }))
    expect(state.activeDraft?.type).toBe('note')
    expect(state.activeDraft?.status).toBe('draft')
  })

  it('updates draft body and saves annotation as unsynced', () => {
    let state = reducer(baseState, startDraft({ type: 'note' }))
    state = reducer(state, updateDraft({ body: 'Important finding' }))
    expect(state.activeDraft?.body).toBe('Important finding')

    state = reducer(state, saveDraft())
    expect(state.annotations).toHaveLength(1)
    expect(state.annotations[0].status).toBe('unsynced')
    expect(state.selectedId).toBe(state.annotations[0].id)
  })

  it('restores a draft when a restore candidate exists', () => {
    const draft = reducer(baseState, startDraft({ type: 'note' })).activeDraft!
    const withRestore: AnnotationState = {
      ...baseState,
      restoreCandidate: draft,
    }
    const restored = reducer(withRestore, restoreDraft())
    expect(restored.activeDraft?.id).toBe(draft.id)
    expect(restored.restoreCandidate).toBeNull()
  })

  it('discards restore candidates', () => {
    const withRestore: AnnotationState = {
      ...baseState,
      restoreCandidate: reducer(baseState, startDraft({ type: 'note' })).activeDraft!,
    }
    const next = reducer(withRestore, discardRestoreCandidate())
    expect(next.restoreCandidate).toBeNull()
  })

  it('selects annotations and updates type', () => {
    let state = reducer(baseState, startDraft({ type: 'note' }))
    state = reducer(state, setDraftType('pin'))
    expect(state.activeDraft?.type).toBe('pin')
    state = reducer(state, updateDraft({ body: 'Test annotation' }))
    state = reducer(state, saveDraft())
    const selected = reducer(state, selectAnnotation(state.annotations[0].id))
    expect(selected.selectedId).toBe(state.annotations[0].id)
  })
})
