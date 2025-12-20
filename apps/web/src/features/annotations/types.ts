import type { Entity, TimelineEvent, GeospatialEvent } from '@/types'

export type AnnotationType = 'note' | 'highlight' | 'pin'
export type AnnotationStatus = 'draft' | 'unsynced' | 'synced'

export type AnnotationTargetKind =
  | 'entity'
  | 'relationship'
  | 'event'
  | 'evidence'
  | 'location'
  | 'region'

export interface AnnotationTargetRef {
  kind: AnnotationTargetKind
  id: string
  label?: string
}

export interface Annotation {
  id: string
  type: AnnotationType
  targetRef?: AnnotationTargetRef
  body: string
  createdAt: string
  updatedAt: string
  status: AnnotationStatus
}

export interface AnnotationState {
  annotations: Annotation[]
  activeDraft?: Annotation
  selectedId?: string
  restoreCandidate?: Annotation | null
}

export interface AnnotationContext {
  entity?: Entity
  timelineEvent?: TimelineEvent
  location?: GeospatialEvent
}
