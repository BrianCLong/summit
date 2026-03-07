import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock4,
  GitBranch,
  GitMerge,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserRound,
  XCircle,
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
import { useShortcut } from '@/contexts/KeyboardShortcutsContext'
import { usePRTriageAdapter, prTriageEnums } from './usePRTriageAdapter'
import {
  defaultPRTriageFilters,
  type PRItem,
  type PRTriageFilters,
  type PRTriageStatus,
  type RiskCheckItem,
  type TriageAction,
} from './types'

// ── Status bucket config ──────────────────────────────────────────────────────

const STATUS_BUCKETS: { value: PRTriageStatus; label: string; icon: React.ReactNode; tone: string }[] = [
  {
    value: 'merge-ready',
    label: 'Merge Ready',
    icon: <GitMerge className="h-3.5 w-3.5" />,
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    value: 'conflict',
    label: 'Conflict',
    icon: <XCircle className="h-3.5 w-3.5" />,
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    value: 'needs-owner-review',
    label: 'Needs Review',
    icon: <CircleDot className="h-3.5 w-3.5" />,
    tone: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    value: 'blocked-on-governance',
    label: 'Governance Block',
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
  },
]

const statusConfig = Object.fromEntries(STATUS_BUCKETS.map(b => [b.value, b])) as Record<
  PRTriageStatus,
  (typeof STATUS_BUCKETS)[number]
>

const PRIORITY_TONE: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
}

const RISK_ICON: Record<string, React.ReactNode> = {
  none: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  low: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  medium: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />,
  high: <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />,
  critical: <ShieldAlert className="h-3.5 w-3.5 text-rose-700" />,
}

// ── Sub-components ────────────────────────────────────────────────────────────

const PaneContainer: React.FC<{
  children: React.ReactNode
  title: string
  right?: React.ReactNode
  className?: string
}> = ({ children, title, right, className }) => (
  <Card className={cn('h-full flex flex-col shadow-sm', className)}>
    <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      {right}
    </CardHeader>
    <CardContent className="flex-1 overflow-hidden p-4 pt-0">{children}</CardContent>
  </Card>
)

// ── PR row in the queue ───────────────────────────────────────────────────────

const PRRow: React.FC<{ pr: PRItem; active: boolean; onSelect: () => void }> = ({
  pr,
  active,
  onSelect,
}) => {
  const cfg = statusConfig[pr.status]
  const failedRisks = pr.riskChecks.filter(r => !r.passed).length

  return (
    <button
      className={cn(
        'w-full text-left rounded-lg border p-3 transition hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40',
        active ? 'border-primary/80 bg-primary/5' : 'border-border'
      )}
      onClick={onSelect}
      aria-pressed={active}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm line-clamp-1 flex-1">
          #{pr.number} {pr.title}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border shrink-0',
            cfg.tone
          )}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
        <UserRound className="h-3 w-3" />
        <span>{pr.author}</span>
        <span className="w-px h-3 bg-border" aria-hidden />
        <GitBranch className="h-3 w-3" />
        <span className="truncate max-w-[120px]">{pr.headBranch}</span>
        <span className="w-px h-3 bg-border" aria-hidden />
        <Clock4 className="h-3 w-3" />
        <span>{new Date(pr.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {failedRisks > 0 && (
          <>
            <span className="w-px h-3 bg-border" aria-hidden />
            <ShieldAlert className="h-3 w-3 text-rose-500" />
            <span className="text-rose-600">{failedRisks} risk{failedRisks > 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', PRIORITY_TONE[pr.priority])}>
          {pr.priority}
        </span>
        {pr.labels.slice(0, 3).map(l => (
          <Badge key={l} variant="outline" className="text-[10px] px-1.5 py-0">{l}</Badge>
        ))}
      </div>
    </button>
  )
}

// ── Diff preview ──────────────────────────────────────────────────────────────

const DiffPreview: React.FC<{ pr?: PRItem }> = ({ pr }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Auto-expand first file when PR changes
    if (pr?.diffFiles.length) setExpanded(new Set([pr.diffFiles[0].path]))
  }, [pr?.id])

  if (!pr) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a PR to preview
      </div>
    )
  }

  const toggle = (path: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const cfg = statusConfig[pr.status]

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-base font-semibold leading-tight">
            #{pr.number} {pr.title}
          </h3>
          <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border shrink-0', cfg.tone)}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{pr.description}</p>
      </div>

      <Separator />

      {/* Branch convergence */}
      <div className="rounded-md border p-3 space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Branch Convergence
        </Label>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1.5">
            {pr.convergence.mergesCleanly ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500" />
            )}
            {pr.convergence.mergesCleanly ? 'Merges cleanly against main' : 'Merge conflict against main'}
          </span>
          {pr.convergence.behindByCommits > 0 && (
            <span className="text-muted-foreground text-xs">
              ({pr.convergence.behindByCommits} commits behind)
            </span>
          )}
        </div>
        {pr.convergence.deprecatedBranches.length > 0 && (
          <div className="mt-1.5">
            <span className="text-xs text-muted-foreground">Would deprecate: </span>
            {pr.convergence.deprecatedBranches.map(b => (
              <Badge key={b} variant="secondary" className="text-[10px] mr-1">{b}</Badge>
            ))}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground">
          Computed {new Date(pr.convergence.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <Separator />

      {/* Diff files */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Changed Files ({pr.diffFiles.length})
        </Label>
        {pr.diffFiles.map(file => (
          <div key={file.path} className="rounded-md border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-left bg-muted/40 hover:bg-muted/70 transition text-sm"
              onClick={() => toggle(file.path)}
              aria-expanded={expanded.has(file.path)}
            >
              <span className="font-mono text-xs truncate flex-1">{file.path}</span>
              <span className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-emerald-600 text-xs">+{file.additions}</span>
                <span className="text-rose-500 text-xs">-{file.deletions}</span>
                {expanded.has(file.path) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            </button>
            {expanded.has(file.path) && (
              <pre className="text-xs font-mono p-3 overflow-x-auto bg-background leading-relaxed whitespace-pre">
                {file.patch.split('\n').map((line, i) => (
                  <span
                    key={i}
                    className={cn(
                      'block',
                      line.startsWith('+') && !line.startsWith('+++')
                        ? 'bg-emerald-50 text-emerald-900'
                        : line.startsWith('-') && !line.startsWith('---')
                        ? 'bg-rose-50 text-rose-900'
                        : line.startsWith('@@')
                        ? 'text-blue-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    {line}
                  </span>
                ))}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Risk checklist ────────────────────────────────────────────────────────────

const RiskCheckRow: React.FC<{ check: RiskCheckItem }> = ({ check }) => (
  <div
    className={cn(
      'rounded-md border p-2.5 flex items-start gap-2.5',
      check.passed ? 'border-border bg-background' : 'border-rose-200 bg-rose-50/40'
    )}
  >
    <span className="shrink-0 mt-0.5">{RISK_ICON[check.riskLevel]}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm font-medium">{check.label}</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
          {check.passed ? 'pass' : 'fail'}
        </span>
      </div>
      {check.detail && (
        <p className="mt-1 text-xs text-muted-foreground leading-snug">{check.detail}</p>
      )}
    </div>
  </div>
)

const RiskPanel: React.FC<{
  pr?: PRItem
  onAct: (action: TriageAction, opts?: { comment?: string; assignedTo?: string }) => void
  pending: boolean
}> = ({ pr, onAct, pending }) => {
  const [comment, setComment] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const assignInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setComment('')
    setAssignTo(pr?.assignee ?? '')
  }, [pr?.id])

  if (!pr) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a PR to triage
      </div>
    )
  }

  const failedChecks = pr.riskChecks.filter(r => !r.passed)
  const passedChecks = pr.riskChecks.filter(r => r.passed)

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {/* Risk checks */}
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Risk Checklist ({failedChecks.length} failed)
        </Label>
        {failedChecks.map(c => <RiskCheckRow key={c.id} check={c} />)}
        {passedChecks.map(c => <RiskCheckRow key={c.id} check={c} />)}
      </div>

      <Separator />

      {/* Quick assign */}
      <div className="space-y-1.5">
        <Label htmlFor="assign-input" className="text-xs uppercase tracking-wide text-muted-foreground">
          Quick Assign
        </Label>
        <div className="flex gap-2">
          <Input
            id="assign-input"
            ref={assignInputRef}
            placeholder="username"
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            className="text-sm h-8"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!assignTo || pending}
            onClick={() => onAct('assign', { assignedTo: assignTo, comment })}
          >
            Assign
          </Button>
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <Label htmlFor="triage-comment" className="text-xs uppercase tracking-wide text-muted-foreground">
          Comment (optional)
        </Label>
        <Textarea
          id="triage-comment"
          placeholder="Add context or rationale..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="text-sm"
        />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="default"
          disabled={pending}
          onClick={() => onAct('approve', { comment })}
          className="flex items-center gap-1.5"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => onAct('request-changes', { comment })}
          className="flex items-center gap-1.5"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Request Changes
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onAct('defer', { comment })}
          className="col-span-2 flex items-center gap-1.5"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock4 className="h-4 w-4" />}
          Defer
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Keyboard: <kbd className="rounded border bg-muted px-1">j/k</kbd> navigate •{' '}
        <kbd className="rounded border bg-muted px-1">a</kbd> approve •{' '}
        <kbd className="rounded border bg-muted px-1">x</kbd> request-changes •{' '}
        <kbd className="rounded border bg-muted px-1">d</kbd> defer •{' '}
        <kbd className="rounded border bg-muted px-1">g</kbd> focus assign •{' '}
        <kbd className="rounded border bg-muted px-1">o</kbd> open PR
      </p>
    </div>
  )
}

// ── Queue filters ─────────────────────────────────────────────────────────────

const QueueFilters: React.FC<{
  filters: PRTriageFilters
  onChange: (next: PRTriageFilters) => void
  counts: Partial<Record<PRTriageStatus | 'all', number>>
}> = ({ filters, onChange, counts }) => {
  const update = (partial: Partial<PRTriageFilters>) => onChange({ ...filters, ...partial })

  return (
    <div className="space-y-3 shrink-0">
      {/* Bucket pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          className={cn(
            'text-[11px] px-2.5 py-1 rounded-full border transition',
            filters.status === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
          )}
          onClick={() => update({ status: 'all' })}
        >
          All ({counts.all ?? 0})
        </button>
        {STATUS_BUCKETS.map(b => (
          <button
            key={b.value}
            className={cn(
              'inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition',
              filters.status === b.value ? `${b.tone} border-current` : 'border-border text-muted-foreground hover:border-primary/50'
            )}
            onClick={() => update({ status: b.value })}
          >
            {b.icon} {b.label} ({counts[b.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Priority + assignee */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="filter-priority" className="text-xs text-muted-foreground">Priority</Label>
          <select
            id="filter-priority"
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
            value={filters.priority}
            onChange={e => update({ priority: e.target.value as PRTriageFilters['priority'] })}
          >
            <option value="all">All</option>
            {prTriageEnums.priorities.map(p => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-assignee" className="text-xs text-muted-foreground">Assignee</Label>
          <Input
            id="filter-assignee"
            placeholder="Any"
            value={filters.assignee}
            onChange={e => update({ assignee: e.target.value })}
            className="mt-1 h-8 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const PRTriagePage: React.FC = () => {
  const adapter = usePRTriageAdapter()
  const [filters, setFilters] = useState<PRTriageFilters>(defaultPRTriageFilters)
  const [prs, setPRs] = useState<PRItem[]>([])
  const [activeId, setActiveId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const assignInputRef = useRef<HTMLInputElement>(null)

  const activePR = useMemo(() => prs.find(p => p.id === activeId), [prs, activeId])

  const refresh = useCallback(
    async (nextFilters = filters) => {
      setLoading(true)
      const result = await adapter.list(nextFilters)
      setPRs(result)
      if (result.length && (!activeId || !result.some(p => p.id === activeId))) {
        setActiveId(result[0].id)
      }
      setLoading(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter, filters]
  )

  useEffect(() => {
    refresh(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const handleAct = useCallback(
    async (action: TriageAction, opts?: { comment?: string; assignedTo?: string }) => {
      if (!activePR) return
      setActing(true)
      await adapter.act(activePR.id, action, opts)
      await refresh(filters)
      setActing(false)
    },
    [activePR, adapter, filters, refresh]
  )

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useShortcut('j', () => {
    if (!prs.length || !activeId) return
    const idx = prs.findIndex(p => p.id === activeId)
    const next = prs[idx + 1]
    if (next) setActiveId(next.id)
  }, { id: 'pr-triage-next', description: 'Next PR', category: 'Navigation' })

  useShortcut('k', () => {
    if (!prs.length || !activeId) return
    const idx = prs.findIndex(p => p.id === activeId)
    const prev = prs[idx - 1]
    if (prev) setActiveId(prev.id)
  }, { id: 'pr-triage-prev', description: 'Previous PR', category: 'Navigation' })

  useShortcut('a', () => handleAct('approve'), { id: 'pr-triage-approve', description: 'Approve PR', category: 'Actions' })
  useShortcut('x', () => handleAct('request-changes'), { id: 'pr-triage-request-changes', description: 'Request changes', category: 'Actions' })
  useShortcut('d', () => handleAct('defer'), { id: 'pr-triage-defer', description: 'Defer PR', category: 'Actions' })

  useShortcut('g', () => {
    // Focus the assign input in the risk panel
    const el = document.getElementById('assign-input') as HTMLInputElement | null
    el?.focus()
  }, { id: 'pr-triage-assign', description: 'Focus assign input', category: 'Actions' })

  useShortcut('o', () => {
    if (!activePR) return
    // In a real integration this would open the PR URL; mock opens a toast
    window.open(`https://github.com/example/summit/pull/${activePR.number}`, '_blank', 'noopener')
  }, { id: 'pr-triage-open', description: 'Open PR in new tab', category: 'Actions' })

  // ── Counts by bucket ──────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const all = prs.length
    const byStatus = Object.fromEntries(
      prTriageEnums.statuses.map(s => [s, prs.filter(p => p.status === s).length])
    ) as Record<PRTriageStatus, number>
    return { all, ...byStatus }
  }, [prs])

  return (
    <TooltipProvider>
      <div className="p-4 h-full bg-muted/30 flex flex-col">
        {/* Page header */}
        <div className="mb-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold">PR Triage Workspace</h1>
            <p className="text-sm text-muted-foreground">
              Queue → Diff Preview → Risk Checklist → Act (mock adapter)
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Reset PR queue"
                onClick={() => { adapter.reset(); refresh(filters) }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset mock data</TooltipContent>
          </Tooltip>
        </div>

        {/* Three-pane layout */}
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left: Queue */}
          <div className="col-span-4 min-h-0">
            <PaneContainer title="PR Queue" className="h-full">
              <div className="flex flex-col gap-3 h-full">
                <QueueFilters filters={filters} onChange={setFilters} counts={counts} />
                <Separator />
                <div className="flex-1 overflow-y-auto space-y-2" role="list" aria-label="PR queue">
                  {loading && Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                  {!loading && prs.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No PRs match the current filters.
                    </div>
                  )}
                  {!loading && prs.map(pr => (
                    <PRRow
                      key={pr.id}
                      pr={pr}
                      active={pr.id === activeId}
                      onSelect={() => setActiveId(pr.id)}
                    />
                  ))}
                </div>
              </div>
            </PaneContainer>
          </div>

          {/* Middle: Diff preview */}
          <div className="col-span-5 min-h-0">
            <PaneContainer title="Diff Preview" className="h-full">
              <DiffPreview pr={activePR} />
            </PaneContainer>
          </div>

          {/* Right: Risk checklist + actions */}
          <div className="col-span-3 min-h-0">
            <PaneContainer title="Risk & Actions" className="h-full border-primary/40">
              <RiskPanel pr={activePR} onAct={handleAct} pending={acting} />
            </PaneContainer>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default PRTriagePage
