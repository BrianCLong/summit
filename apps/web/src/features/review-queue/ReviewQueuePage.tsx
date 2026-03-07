import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock4,
  Filter,
  Loader2,
  MinusCircle,
  UserRound,
  RotateCcw,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Skeleton,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useQueueAdapter } from './useQueueAdapter'
import {
  defaultQueueFilters,
  type QueueAction,
  type QueueFilters,
  type QueueItem,
} from './types'
import { useShortcut } from '@/contexts/KeyboardShortcutsContext'

const PaneContainer: React.FC<{
  children: React.ReactNode
  title: string
  right?: React.ReactNode
  className?: string
}> = ({ children, title, right, className }) => (
  <Card className={cn('h-full flex flex-col shadow-sm', className)}>
    <CardHeader className="flex flex-row items-center justify-between pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        {title}
      </CardTitle>
      {right}
    </CardHeader>
    <CardContent className="flex-1 overflow-hidden p-4 pt-0">
      {children}
    </CardContent>
  </Card>
)

const ItemRow: React.FC<{
  item: QueueItem
  active: boolean
  onSelect: () => void
}> = ({ item, active, onSelect }) => {
  const statusTone = {
    open: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    deferred: 'bg-slate-100 text-slate-800',
  }

  return (
    <button
      className={cn(
        'w-full text-left rounded-lg border p-3 transition hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40',
        active ? 'border-primary/80 bg-primary/5' : 'border-border'
      )}
      onClick={onSelect}
      aria-pressed={active}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm line-clamp-1">{item.title}</div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize text-[11px]">
            {item.priority}
          </Badge>
          <span
            className={cn(
              'text-[11px] px-2 py-0.5 rounded-full capitalize',
              statusTone[item.status]
            )}
          >
            {item.status}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
        {item.context}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <UserRound className="h-3 w-3" />
        <span>{item.assignee}</span>
        <span className="w-px h-3 bg-border" aria-hidden />
        <Clock4 className="h-3 w-3" />
        <span>
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {item.tags && item.tags.length > 0 && (
          <>
            <span className="w-px h-3 bg-border" aria-hidden />
            <span className="line-clamp-1 flex-1">
              {item.tags.slice(0, 2).join(', ')}
            </span>
          </>
        )}
      </div>
    </button>
  )
}

const PreviewPane: React.FC<{ item?: QueueItem }> = ({ item }) => {
  if (!item) {
    return <EmptyPreview />
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{item.context}</p>
      </div>

      <Separator />

      {item.preview.snippet && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Evidence
          </Label>
          <p className="text-sm rounded-md border bg-muted/40 p-3 leading-relaxed">
            {item.preview.snippet}
          </p>
        </div>
      )}

      {item.preview.entityDiff && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Before
            </Label>
            <pre className="mt-2 rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap border">
              {item.preview.entityDiff.before}
            </pre>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              After
            </Label>
            <pre className="mt-2 rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap border">
              {item.preview.entityDiff.after}
            </pre>
          </div>
          <div className="col-span-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Highlights
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.preview.entityDiff.highlights.map(highlight => (
                <Badge
                  key={highlight}
                  variant="outline"
                  className="text-[11px]"
                >
                  {highlight}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {item.preview.policyWarning && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Policy warning
          </Label>
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex gap-2">
            <MinusCircle className="h-4 w-4" />
            <span>{item.preview.policyWarning}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const EmptyPreview = () => (
  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
    Select an item to preview
  </div>
)

const ActionsPane: React.FC<{
  item?: QueueItem
  onAct: (action: QueueAction, reason?: string) => void
  pending: boolean
}> = ({ item, onAct, pending }) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    setReason('')
  }, [item?.id])

  if (!item) {
    return <EmptyPreview />
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Decision
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Capture an audit-friendly decision with rationale.
        </p>
      </div>

      <Textarea
        placeholder="Add rationale (optional but recommended)"
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={5}
        className="text-sm"
      />

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="default"
          disabled={pending}
          onClick={() => onAct('approve', reason)}
          className="flex items-center gap-2"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => onAct('reject', reason)}
          className="flex items-center gap-2"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MinusCircle className="h-4 w-4" />
          )}
          Reject
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onAct('defer', reason)}
          className="flex items-center gap-2"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Clock4 className="h-4 w-4" />
          )}
          Defer
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Decisions persist locally with timestamp and user stub. Keyboard: j/k to
        move, a/r/d to act.
      </p>
    </div>
  )
}

const FiltersPane: React.FC<{
  filters: QueueFilters
  onChange: (next: QueueFilters) => void
  counts: { open: number; resolved: number }
}> = ({ filters, onChange, counts }) => {
  const update = (partial: Partial<QueueFilters>) =>
    onChange({ ...filters, ...partial })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Filter className="h-4 w-4" /> Filters
        <Badge
          variant={filters.status === 'open' ? 'default' : 'secondary'}
          className="text-[11px]"
        >
          {counts.open} open
        </Badge>
        <Badge
          variant={filters.status === 'resolved' ? 'default' : 'secondary'}
          className="text-[11px]"
        >
          {counts.resolved} resolved
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label
            htmlFor="filter-type"
            className="text-xs text-muted-foreground"
          >
            Type
          </Label>
          <select
            id="filter-type"
            className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={filters.type}
            onChange={e =>
              update({ type: e.target.value as QueueFilters['type'] })
            }
          >
            <option value="all">All</option>
            <option value="entity-diff">Entity diff</option>
            <option value="evidence">Evidence</option>
            <option value="policy">Policy</option>
          </select>
        </div>
        <div>
          <Label
            htmlFor="filter-priority"
            className="text-xs text-muted-foreground"
          >
            Priority
          </Label>
          <select
            id="filter-priority"
            className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={filters.priority}
            onChange={e =>
              update({ priority: e.target.value as QueueFilters['priority'] })
            }
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <Label
            htmlFor="filter-assignee"
            className="text-xs text-muted-foreground"
          >
            Assignee
          </Label>
          <Input
            id="filter-assignee"
            placeholder="Any"
            value={filters.assignee === 'all' ? '' : filters.assignee}
            onChange={e => update({ assignee: e.target.value || 'all' })}
          />
        </div>
        <div>
          <Label
            htmlFor="filter-status"
            className="text-xs text-muted-foreground"
          >
            Status
          </Label>
          <select
            id="filter-status"
            className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={filters.status}
            onChange={e =>
              update({ status: e.target.value as QueueFilters['status'] })
            }
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export const ReviewQueuePage: React.FC = () => {
  const adapter = useQueueAdapter()
  const [filters, setFilters] = useState<QueueFilters>(defaultQueueFilters)
  const [items, setItems] = useState<QueueItem[]>([])
  const [activeId, setActiveId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const activeItem = useMemo(
    () => items.find(item => item.id === activeId),
    [items, activeId]
  )

  const refresh = async (nextFilters = filters) => {
    setLoading(true)
    const result = await adapter.list(nextFilters)
    setItems(result)
    if (
      result.length &&
      (!activeId || !result.some(item => item.id === activeId))
    ) {
      setActiveId(result[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const handleAct = async (action: QueueAction, reason?: string) => {
    if (!activeItem) return
    setActing(true)
    await adapter.act(activeItem.id, action, { reason })
    await refresh(filters)
    setActing(false)
  }

  useShortcut(
    'j',
    () => {
      if (!items.length || !activeId) return
      const idx = items.findIndex(item => item.id === activeId)
      const next = items[idx + 1]
      if (next) setActiveId(next.id)
    },
    {
      id: 'queue-next',
      description: 'Next review item',
      category: 'Navigation',
    }
  )

  useShortcut(
    'k',
    () => {
      if (!items.length || !activeId) return
      const idx = items.findIndex(item => item.id === activeId)
      const prev = items[idx - 1]
      if (prev) setActiveId(prev.id)
    },
    {
      id: 'queue-prev',
      description: 'Previous review item',
      category: 'Navigation',
    }
  )

  useShortcut('a', () => handleAct('approve'), {
    id: 'queue-approve',
    description: 'Approve item',
    category: 'Actions',
  })
  useShortcut('r', () => handleAct('reject'), {
    id: 'queue-reject',
    description: 'Reject item',
    category: 'Actions',
  })
  useShortcut('d', () => handleAct('defer'), {
    id: 'queue-defer',
    description: 'Defer item',
    category: 'Actions',
  })

  const counts = useMemo(() => {
    const open = items.filter(i => i.status === 'open').length
    const resolved = items.filter(i => i.status !== 'open').length
    return { open, resolved }
  }, [items])

  return (
    <TooltipProvider>
      <div className="p-4 h-full bg-muted/30">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Review Queue</h1>
            <p className="text-sm text-muted-foreground">
              Triage → Resolve → Export (mocked adapter)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="rounded border bg-white px-2 py-1">j/k</kbd>{' '}
            navigate
            <kbd className="rounded border bg-white px-2 py-1">a</kbd> approve
            <kbd className="rounded border bg-white px-2 py-1">r</kbd> reject
            <kbd className="rounded border bg-white px-2 py-1">d</kbd> defer
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-140px)]">
          <div className="col-span-4">
            <PaneContainer
              title="Queue"
              right={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Reset queue"
                      onClick={adapter.reset}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset mock data</TooltipContent>
                </Tooltip>
              }
              className="h-full"
            >
              <div className="space-y-3 h-full flex flex-col">
                <FiltersPane
                  filters={filters}
                  onChange={setFilters}
                  counts={counts}
                />
                <Separator />
                <div className="flex-1 overflow-y-auto space-y-2" role="list">
                  {loading && (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full" />
                      ))}
                    </div>
                  )}
                  {!loading && items.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      No items match the current filters.
                    </div>
                  )}
                  {!loading &&
                    items.map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        active={item.id === activeId}
                        onSelect={() => setActiveId(item.id)}
                      />
                    ))}
                </div>
              </div>
            </PaneContainer>
          </div>

          <div className="col-span-5">
            <PaneContainer title="Preview">
              <PreviewPane item={activeItem} />
            </PaneContainer>
          </div>

          <div className="col-span-3">
            <PaneContainer title="Actions" className="border-primary/40">
              <ActionsPane
                item={activeItem}
                onAct={handleAct}
                pending={acting}
              />
            </PaneContainer>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ReviewQueuePage
