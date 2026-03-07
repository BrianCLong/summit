import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'
import {
  startDraft,
  updateDraft,
  saveDraft,
  selectAnnotation,
  restoreDraft,
  discardRestoreCandidate,
  setDraftType,
} from './annotationsSlice'
import type {
  AnnotationContext,
  AnnotationTargetRef,
  AnnotationType,
} from './types'

interface AnnotationPanelProps {
  context?: AnnotationContext
}

const targetLabel = (target?: AnnotationTargetRef) => {
  if (!target) return 'No target'
  return `${target.kind}: ${target.label ?? target.id}`
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  context,
}) => {
  const dispatch = useDispatch()
  const { annotations, activeDraft, selectedId, restoreCandidate } =
    useSelector((state: RootState) => state.annotations)

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [annotations]
  )

  const selectedIndex = sortedAnnotations.findIndex(a => a.id === selectedId)

  const resolvedTarget: AnnotationTargetRef | undefined = useMemo(() => {
    if (activeDraft?.targetRef) return activeDraft.targetRef
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
  }, [activeDraft?.targetRef, context])

  const ensureDraft = (type: AnnotationType = 'note') => {
    if (!activeDraft) {
      dispatch(startDraft({ type, context }))
    }
  }

  const handleShortcut = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return
    }
    if (event.key === 'n') {
      event.preventDefault()
      dispatch(startDraft({ type: 'note', context }))
    }
    if (event.key === 'p') {
      event.preventDefault()
      dispatch(startDraft({ type: 'pin', context }))
    }
    if (event.key === 'ArrowRight' || event.key === ']') {
      if (sortedAnnotations.length === 0) return
      const nextIndex =
        selectedIndex >= 0 ? (selectedIndex + 1) % sortedAnnotations.length : 0
      dispatch(selectAnnotation(sortedAnnotations[nextIndex].id))
    }
    if (event.key === 'ArrowLeft' || event.key === '[') {
      if (sortedAnnotations.length === 0) return
      const prevIndex =
        selectedIndex > 0 ? selectedIndex - 1 : sortedAnnotations.length - 1
      dispatch(selectAnnotation(sortedAnnotations[prevIndex].id))
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedAnnotations, selectedIndex, context])

  useEffect(() => {
    if (!activeDraft && !restoreCandidate) return
    // Autosave handled in reducer by localStorage writes
  }, [activeDraft, restoreCandidate])

  return (
    <Card className="h-full" aria-labelledby="annotation-panel-title">
      <CardHeader className="pb-3">
        <CardTitle
          id="annotation-panel-title"
          className="flex items-center gap-2 text-sm"
        >
          Annotation Panel
          <Badge variant="secondary" className="text-[11px]">
            Beta
          </Badge>
        </CardTitle>
        <div className="sr-only" aria-live="polite">
          Keyboard shortcuts: N to create note, P to pin selection, [ and ] to
          navigate annotations.
        </div>
        {restoreCandidate && (
          <div
            className="mt-2 rounded-md border border-dashed border-amber-400 bg-amber-50 p-2 text-xs text-amber-900 flex items-center justify-between gap-2"
            role="alert"
            aria-live="assertive"
          >
            <span>Restore your unsaved draft?</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => dispatch(restoreDraft())}
              >
                Restore
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch(discardRestoreCandidate())}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(startDraft({ type: 'note', context }))}
            aria-label="Create note (N)"
          >
            New Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(startDraft({ type: 'pin', context }))}
            aria-label="Create pin (P)"
          >
            Pin Selection
          </Button>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {context?.timelineEvent
              ? `Focused event: ${context.timelineEvent.title}`
              : context?.entity
                ? `Focused entity: ${context.entity.name}`
                : 'No selection'}
          </div>
        </div>

        <div
          className="border rounded-md p-3 space-y-2"
          aria-label="Annotation draft form"
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Type
              <select
                className="rounded-md border bg-background p-2 text-sm"
                value={activeDraft?.type ?? 'note'}
                onChange={e => {
                  const nextType = e.target.value as AnnotationType
                  ensureDraft(nextType)
                  dispatch(setDraftType(nextType))
                }}
                aria-label="Annotation type"
              >
                <option value="note">Note</option>
                <option value="highlight">Highlight</option>
                <option value="pin">Pin</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Target
              <Input
                readOnly
                value={targetLabel(resolvedTarget)}
                placeholder="No target selected"
                aria-label="Annotation target"
              />
            </label>
          </div>
          <Textarea
            value={activeDraft?.body ?? ''}
            onFocus={() => ensureDraft('note')}
            onChange={e => {
              ensureDraft(activeDraft?.type ?? 'note')
              dispatch(updateDraft({ body: e.target.value }))
            }}
            placeholder="Add details, context, or reasoning..."
            aria-label="Annotation body"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(saveDraft())}
              disabled={!activeDraft?.body?.trim()}
              aria-label="Save draft locally"
            >
              Save locally
            </Button>
            <Button
              size="sm"
              onClick={() => dispatch(saveDraft())}
              disabled={!activeDraft?.body?.trim()}
              aria-label="Save annotation"
            >
              Save annotation
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Drafts auto-save locally. Unsynced annotations are labeled
            accordingly.
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Annotations
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {sortedAnnotations.length} items
            </span>
          </div>
          <ScrollArea
            className="max-h-64 border rounded-md"
            aria-label="Annotation list"
          >
            <ul role="list" className="divide-y">
              {sortedAnnotations.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">
                  No annotations yet.
                </li>
              )}
              {sortedAnnotations.map(annotation => (
                <li
                  key={annotation.id}
                  className={cn(
                    'p-3 text-sm flex flex-col gap-1 cursor-pointer focus-within:ring-2 focus-within:ring-ring',
                    selectedId === annotation.id && 'bg-muted/60'
                  )}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedId === annotation.id}
                  onClick={() => dispatch(selectAnnotation(annotation.id))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      dispatch(selectAnnotation(annotation.id))
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] capitalize">
                      {annotation.type}
                    </Badge>
                    {annotation.status === 'unsynced' && (
                      <Badge variant="secondary" className="text-[11px]">
                        Unsynced
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(annotation.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {targetLabel(annotation.targetRef)}
                  </div>
                  <p className="text-sm leading-snug">{annotation.body}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

export default AnnotationPanel
