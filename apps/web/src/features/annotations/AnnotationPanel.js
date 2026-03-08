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
exports.AnnotationPanel = void 0;
const react_1 = __importStar(require("react"));
const react_redux_1 = require("react-redux");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const scroll_area_1 = require("@/components/ui/scroll-area");
const utils_1 = require("@/lib/utils");
const annotationsSlice_1 = require("./annotationsSlice");
const targetLabel = (target) => {
    if (!target)
        return 'No target';
    return `${target.kind}: ${target.label ?? target.id}`;
};
const AnnotationPanel = ({ context }) => {
    const dispatch = (0, react_redux_1.useDispatch)();
    const { annotations, activeDraft, selectedId, restoreCandidate } = (0, react_redux_1.useSelector)((state) => state.annotations);
    const sortedAnnotations = (0, react_1.useMemo)(() => [...annotations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [annotations]);
    const selectedIndex = sortedAnnotations.findIndex(a => a.id === selectedId);
    const resolvedTarget = (0, react_1.useMemo)(() => {
        if (activeDraft?.targetRef)
            return activeDraft.targetRef;
        if (context?.timelineEvent) {
            return {
                kind: 'event',
                id: context.timelineEvent.id,
                label: context.timelineEvent.title ?? 'Timeline event',
            };
        }
        if (context?.entity) {
            return { kind: 'entity', id: context.entity.id, label: context.entity.name };
        }
        if (context?.location) {
            return {
                kind: 'location',
                id: context.location.id,
                label: context.location.location.name ?? 'Location',
            };
        }
        return undefined;
    }, [activeDraft?.targetRef, context]);
    const ensureDraft = (type = 'note') => {
        if (!activeDraft) {
            dispatch((0, annotationsSlice_1.startDraft)({ type, context }));
        }
    };
    const handleShortcut = (event) => {
        if (event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement) {
            return;
        }
        if (event.key === 'n') {
            event.preventDefault();
            dispatch((0, annotationsSlice_1.startDraft)({ type: 'note', context }));
        }
        if (event.key === 'p') {
            event.preventDefault();
            dispatch((0, annotationsSlice_1.startDraft)({ type: 'pin', context }));
        }
        if (event.key === 'ArrowRight' || event.key === ']') {
            if (sortedAnnotations.length === 0)
                return;
            const nextIndex = selectedIndex >= 0 ? (selectedIndex + 1) % sortedAnnotations.length : 0;
            dispatch((0, annotationsSlice_1.selectAnnotation)(sortedAnnotations[nextIndex].id));
        }
        if (event.key === 'ArrowLeft' || event.key === '[') {
            if (sortedAnnotations.length === 0)
                return;
            const prevIndex = selectedIndex > 0
                ? selectedIndex - 1
                : sortedAnnotations.length - 1;
            dispatch((0, annotationsSlice_1.selectAnnotation)(sortedAnnotations[prevIndex].id));
        }
    };
    (0, react_1.useEffect)(() => {
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedAnnotations, selectedIndex, context]);
    (0, react_1.useEffect)(() => {
        if (!activeDraft && !restoreCandidate)
            return;
        // Autosave handled in reducer by localStorage writes
    }, [activeDraft, restoreCandidate]);
    return (<Card_1.Card className="h-full" aria-labelledby="annotation-panel-title">
      <Card_1.CardHeader className="pb-3">
        <Card_1.CardTitle id="annotation-panel-title" className="flex items-center gap-2 text-sm">
          Annotation Panel
          <Badge_1.Badge variant="secondary" className="text-[11px]">Beta</Badge_1.Badge>
        </Card_1.CardTitle>
        <div className="sr-only" aria-live="polite">
          Keyboard shortcuts: N to create note, P to pin selection, [ and ] to navigate annotations.
        </div>
        {restoreCandidate && (<div className="mt-2 rounded-md border border-dashed border-amber-400 bg-amber-50 p-2 text-xs text-amber-900 flex items-center justify-between gap-2" role="alert" aria-live="assertive">
            <span>Restore your unsaved draft?</span>
            <div className="flex gap-2">
              <Button_1.Button size="sm" variant="default" onClick={() => dispatch((0, annotationsSlice_1.restoreDraft)())}>
                Restore
              </Button_1.Button>
              <Button_1.Button size="sm" variant="outline" onClick={() => dispatch((0, annotationsSlice_1.discardRestoreCandidate)())}>
                Discard
              </Button_1.Button>
            </div>
          </div>)}
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button_1.Button variant="outline" size="sm" onClick={() => dispatch((0, annotationsSlice_1.startDraft)({ type: 'note', context }))} aria-label="Create note (N)">
            New Note
          </Button_1.Button>
          <Button_1.Button variant="outline" size="sm" onClick={() => dispatch((0, annotationsSlice_1.startDraft)({ type: 'pin', context }))} aria-label="Create pin (P)">
            Pin Selection
          </Button_1.Button>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {context?.timelineEvent
            ? `Focused event: ${context.timelineEvent.title}`
            : context?.entity
                ? `Focused entity: ${context.entity.name}`
                : 'No selection'}
          </div>
        </div>

        <div className="border rounded-md p-3 space-y-2" aria-label="Annotation draft form">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Type
              <select className="rounded-md border bg-background p-2 text-sm" value={activeDraft?.type ?? 'note'} onChange={e => {
            const nextType = e.target.value;
            ensureDraft(nextType);
            dispatch((0, annotationsSlice_1.setDraftType)(nextType));
        }} aria-label="Annotation type">
                <option value="note">Note</option>
                <option value="highlight">Highlight</option>
                <option value="pin">Pin</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Target
              <input_1.Input readOnly value={targetLabel(resolvedTarget)} placeholder="No target selected" aria-label="Annotation target"/>
            </label>
          </div>
          <textarea_1.Textarea value={activeDraft?.body ?? ''} onFocus={() => ensureDraft('note')} onChange={e => {
            ensureDraft(activeDraft?.type ?? 'note');
            dispatch((0, annotationsSlice_1.updateDraft)({ body: e.target.value }));
        }} placeholder="Add details, context, or reasoning..." aria-label="Annotation body"/>
          <div className="flex justify-end gap-2">
            <Button_1.Button variant="outline" size="sm" onClick={() => dispatch((0, annotationsSlice_1.saveDraft)())} disabled={!activeDraft?.body?.trim()} aria-label="Save draft locally">
              Save locally
            </Button_1.Button>
            <Button_1.Button size="sm" onClick={() => dispatch((0, annotationsSlice_1.saveDraft)())} disabled={!activeDraft?.body?.trim()} aria-label="Save annotation">
              Save annotation
            </Button_1.Button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Drafts auto-save locally. Unsynced annotations are labeled accordingly.
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
          <scroll_area_1.ScrollArea className="max-h-64 border rounded-md" aria-label="Annotation list">
            <ul role="list" className="divide-y">
              {sortedAnnotations.length === 0 && (<li className="p-3 text-sm text-muted-foreground">No annotations yet.</li>)}
              {sortedAnnotations.map(annotation => (<li key={annotation.id} className={(0, utils_1.cn)('p-3 text-sm flex flex-col gap-1 cursor-pointer focus-within:ring-2 focus-within:ring-ring', selectedId === annotation.id && 'bg-muted/60')} role="button" tabIndex={0} aria-pressed={selectedId === annotation.id} onClick={() => dispatch((0, annotationsSlice_1.selectAnnotation)(annotation.id))} onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch((0, annotationsSlice_1.selectAnnotation)(annotation.id));
                }
            }}>
                  <div className="flex items-center gap-2">
                    <Badge_1.Badge variant="outline" className="text-[11px] capitalize">
                      {annotation.type}
                    </Badge_1.Badge>
                    {annotation.status === 'unsynced' && (<Badge_1.Badge variant="secondary" className="text-[11px]">Unsynced</Badge_1.Badge>)}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(annotation.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {targetLabel(annotation.targetRef)}
                  </div>
                  <p className="text-sm leading-snug">{annotation.body}</p>
                </li>))}
            </ul>
          </scroll_area_1.ScrollArea>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.AnnotationPanel = AnnotationPanel;
exports.default = exports.AnnotationPanel;
