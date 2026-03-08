"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewQueuePage = void 0;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const ui_1 = require("@/components/ui");
const utils_1 = require("@/lib/utils");
const useQueueAdapter_1 = require("./useQueueAdapter");
const types_1 = require("./types");
const KeyboardShortcutsContext_1 = require("@/contexts/KeyboardShortcutsContext");
const PaneContainer = ({ children, title, right, className }) => (<ui_1.Card className={(0, utils_1.cn)('h-full flex flex-col shadow-sm', className)}>
    <ui_1.CardHeader className="flex flex-row items-center justify-between pb-3">
      <ui_1.CardTitle className="text-base font-semibold flex items-center gap-2">
        {title}
      </ui_1.CardTitle>
      {right}
    </ui_1.CardHeader>
    <ui_1.CardContent className="flex-1 overflow-hidden p-4 pt-0">{children}</ui_1.CardContent>
  </ui_1.Card>);
const ItemRow = ({ item, active, onSelect }) => {
    const statusTone = {
        open: 'bg-amber-100 text-amber-800',
        approved: 'bg-emerald-100 text-emerald-800',
        rejected: 'bg-rose-100 text-rose-800',
        deferred: 'bg-slate-100 text-slate-800',
    };
    return (<button className={(0, utils_1.cn)('w-full text-left rounded-lg border p-3 transition hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40', active ? 'border-primary/80 bg-primary/5' : 'border-border')} onClick={onSelect} aria-pressed={active}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm line-clamp-1">{item.title}</div>
        <div className="flex items-center gap-2">
          <ui_1.Badge variant="secondary" className="capitalize text-[11px]">
            {item.priority}
          </ui_1.Badge>
        <span className={(0, utils_1.cn)('text-[11px] px-2 py-0.5 rounded-full capitalize', statusTone[item.status])}>
          {item.status}
        </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.context}</div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <lucide_react_1.UserRound className="h-3 w-3"/>
        <span>{item.assignee}</span>
        <span className="w-px h-3 bg-border" aria-hidden/>
        <lucide_react_1.Clock4 className="h-3 w-3"/>
        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {item.tags && item.tags.length > 0 && (<>
            <span className="w-px h-3 bg-border" aria-hidden/>
            <span className="line-clamp-1 flex-1">{item.tags.slice(0, 2).join(', ')}</span>
          </>)}
      </div>
    </button>);
};
const PreviewPane = ({ item }) => {
    if (!item) {
        return <EmptyPreview />;
    }
    return (<div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{item.context}</p>
      </div>

      <ui_1.Separator />

      {item.preview.snippet && (<div className="space-y-2">
          <ui_1.Label className="text-xs uppercase tracking-wide text-muted-foreground">Evidence</ui_1.Label>
          <p className="text-sm rounded-md border bg-muted/40 p-3 leading-relaxed">{item.preview.snippet}</p>
        </div>)}

      {item.preview.entityDiff && (<div className="grid grid-cols-2 gap-3">
          <div>
            <ui_1.Label className="text-xs uppercase tracking-wide text-muted-foreground">Before</ui_1.Label>
            <pre className="mt-2 rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap border">{item.preview.entityDiff.before}</pre>
          </div>
          <div>
            <ui_1.Label className="text-xs uppercase tracking-wide text-muted-foreground">After</ui_1.Label>
            <pre className="mt-2 rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap border">{item.preview.entityDiff.after}</pre>
          </div>
          <div className="col-span-2">
            <ui_1.Label className="text-xs uppercase tracking-wide text-muted-foreground">Highlights</ui_1.Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.preview.entityDiff.highlights.map((highlight) => (<ui_1.Badge key={highlight} variant="outline" className="text-[11px]">
                  {highlight}
                </ui_1.Badge>))}
            </div>
          </div>
        </div>)}

      {item.preview.policyWarning && (<div className="space-y-2">
          <ui_1.Label className="text-xs uppercase tracking-wide text-muted-foreground">Policy warning</ui_1.Label>
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex gap-2">
            <lucide_react_1.MinusCircle className="h-4 w-4"/>
            <span>{item.preview.policyWarning}</span>
          </div>
        </div>)}
    </div>);
};
const EmptyPreview = () => (<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
    Select an item to preview
  </div>);
const ActionsPane = ({ item, onAct, pending }) => {
    const [reason, setReason] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        setReason('');
    }, [item?.id]);
    if (!item) {
        return <EmptyPreview />;
    }
    return (<div className="flex flex-col gap-3">
      <div>
        <ui_1.Label className="text-xs uppercase tracking-wide text-muted-foreground">Decision</ui_1.Label>
        <p className="text-sm text-muted-foreground mt-1">Capture an audit-friendly decision with rationale.</p>
      </div>

      <ui_1.Textarea placeholder="Add rationale (optional but recommended)" value={reason} onChange={(e) => setReason(e.target.value)} rows={5} className="text-sm"/>

      <div className="grid grid-cols-3 gap-2">
        <ui_1.Button variant="default" disabled={pending} onClick={() => onAct('approve', reason)} className="flex items-center gap-2">
          {pending ? <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/> : <lucide_react_1.CheckCircle2 className="h-4 w-4"/>}
          Approve
        </ui_1.Button>
        <ui_1.Button variant="destructive" disabled={pending} onClick={() => onAct('reject', reason)} className="flex items-center gap-2">
          {pending ? <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/> : <lucide_react_1.MinusCircle className="h-4 w-4"/>}
          Reject
        </ui_1.Button>
        <ui_1.Button variant="outline" disabled={pending} onClick={() => onAct('defer', reason)} className="flex items-center gap-2">
          {pending ? <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/> : <lucide_react_1.Clock4 className="h-4 w-4"/>}
          Defer
        </ui_1.Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Decisions persist locally with timestamp and user stub. Keyboard: j/k to move, a/r/d to act.
      </p>
    </div>);
};
const FiltersPane = ({ filters, onChange, counts }) => {
    const update = (partial) => onChange({ ...filters, ...partial });
    return (<div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <lucide_react_1.Filter className="h-4 w-4"/> Filters
        <ui_1.Badge variant={filters.status === 'open' ? 'default' : 'secondary'} className="text-[11px]">{counts.open} open</ui_1.Badge>
        <ui_1.Badge variant={filters.status === 'resolved' ? 'default' : 'secondary'} className="text-[11px]">{counts.resolved} resolved</ui_1.Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <ui_1.Label htmlFor="filter-type" className="text-xs text-muted-foreground">Type</ui_1.Label>
          <select id="filter-type" className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={filters.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="all">All</option>
            <option value="entity-diff">Entity diff</option>
            <option value="evidence">Evidence</option>
            <option value="policy">Policy</option>
          </select>
        </div>
        <div>
          <ui_1.Label htmlFor="filter-priority" className="text-xs text-muted-foreground">Priority</ui_1.Label>
          <select id="filter-priority" className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={filters.priority} onChange={(e) => update({ priority: e.target.value })}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <ui_1.Label htmlFor="filter-assignee" className="text-xs text-muted-foreground">Assignee</ui_1.Label>
          <ui_1.Input id="filter-assignee" placeholder="Any" value={filters.assignee === 'all' ? '' : filters.assignee} onChange={(e) => update({ assignee: e.target.value || 'all' })}/>
        </div>
        <div>
          <ui_1.Label htmlFor="filter-status" className="text-xs text-muted-foreground">Status</ui_1.Label>
          <select id="filter-status" className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
    </div>);
};
const ReviewQueuePage = () => {
    const adapter = (0, useQueueAdapter_1.useQueueAdapter)();
    const [filters, setFilters] = (0, react_1.useState)(types_1.defaultQueueFilters);
    const [items, setItems] = (0, react_1.useState)([]);
    const [activeId, setActiveId] = (0, react_1.useState)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [acting, setActing] = (0, react_1.useState)(false);
    const activeItem = (0, react_1.useMemo)(() => items.find((item) => item.id === activeId), [items, activeId]);
    const refresh = async (nextFilters = filters) => {
        setLoading(true);
        const result = await adapter.list(nextFilters);
        setItems(result);
        if (result.length && (!activeId || !result.some((item) => item.id === activeId))) {
            setActiveId(result[0].id);
        }
        setLoading(false);
    };
    (0, react_1.useEffect)(() => {
        refresh(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);
    const handleAct = async (action, reason) => {
        if (!activeItem)
            return;
        setActing(true);
        await adapter.act(activeItem.id, action, { reason });
        await refresh(filters);
        setActing(false);
    };
    (0, KeyboardShortcutsContext_1.useShortcut)('j', () => {
        if (!items.length || !activeId)
            return;
        const idx = items.findIndex((item) => item.id === activeId);
        const next = items[idx + 1];
        if (next)
            setActiveId(next.id);
    }, { id: 'queue-next', description: 'Next review item', category: 'Navigation' });
    (0, KeyboardShortcutsContext_1.useShortcut)('k', () => {
        if (!items.length || !activeId)
            return;
        const idx = items.findIndex((item) => item.id === activeId);
        const prev = items[idx - 1];
        if (prev)
            setActiveId(prev.id);
    }, { id: 'queue-prev', description: 'Previous review item', category: 'Navigation' });
    (0, KeyboardShortcutsContext_1.useShortcut)('a', () => handleAct('approve'), { id: 'queue-approve', description: 'Approve item', category: 'Actions' });
    (0, KeyboardShortcutsContext_1.useShortcut)('r', () => handleAct('reject'), { id: 'queue-reject', description: 'Reject item', category: 'Actions' });
    (0, KeyboardShortcutsContext_1.useShortcut)('d', () => handleAct('defer'), { id: 'queue-defer', description: 'Defer item', category: 'Actions' });
    const counts = (0, react_1.useMemo)(() => {
        const open = items.filter((i) => i.status === 'open').length;
        const resolved = items.filter((i) => i.status !== 'open').length;
        return { open, resolved };
    }, [items]);
    return (<ui_1.TooltipProvider>
      <div className="p-4 h-full bg-muted/30">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Review Queue</h1>
            <p className="text-sm text-muted-foreground">Triage → Resolve → Export (mocked adapter)</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="rounded border bg-white px-2 py-1">j/k</kbd> navigate
            <kbd className="rounded border bg-white px-2 py-1">a</kbd> approve
            <kbd className="rounded border bg-white px-2 py-1">r</kbd> reject
            <kbd className="rounded border bg-white px-2 py-1">d</kbd> defer
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-140px)]">
          <div className="col-span-4">
            <PaneContainer title="Queue" right={<ui_1.Tooltip>
                  <ui_1.TooltipTrigger asChild>
                    <ui_1.Button size="icon" variant="ghost" aria-label="Reset queue" onClick={adapter.reset}>
                      <lucide_react_1.RotateCcw className="h-4 w-4"/>
                    </ui_1.Button>
                  </ui_1.TooltipTrigger>
                  <ui_1.TooltipContent>Reset mock data</ui_1.TooltipContent>
                </ui_1.Tooltip>} className="h-full">
              <div className="space-y-3 h-full flex flex-col">
                <FiltersPane filters={filters} onChange={setFilters} counts={counts}/>
                <ui_1.Separator />
                <div className="flex-1 overflow-y-auto space-y-2" role="list">
                  {loading && (<div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, idx) => (<ui_1.Skeleton key={idx} className="h-16 w-full"/>))}
                    </div>)}
                  {!loading && items.length === 0 && (<div className="text-sm text-muted-foreground text-center py-6">
                      No items match the current filters.
                    </div>)}
                  {!loading && items.map((item) => (<ItemRow key={item.id} item={item} active={item.id === activeId} onSelect={() => setActiveId(item.id)}/>))}
                </div>
              </div>
            </PaneContainer>
          </div>

          <div className="col-span-5">
            <PaneContainer title="Preview">
              <PreviewPane item={activeItem}/>
            </PaneContainer>
          </div>

          <div className="col-span-3">
            <PaneContainer title="Actions" className="border-primary/40">
              <ActionsPane item={activeItem} onAct={handleAct} pending={acting}/>
            </PaneContainer>
          </div>
        </div>
      </div>
    </ui_1.TooltipProvider>);
};
exports.ReviewQueuePage = ReviewQueuePage;
exports.default = exports.ReviewQueuePage;
