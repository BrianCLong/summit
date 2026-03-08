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
exports.RunOutputs = exports.RunTasks = exports.RunSummary = exports.TaskStatusBadge = void 0;
exports.formatArtifactData = formatArtifactData;
exports.CopyButton = CopyButton;
const React = __importStar(require("react"));
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const scroll_area_1 = require("@/components/ui/scroll-area");
// Helper component for task status badge
exports.TaskStatusBadge = React.memo(({ status }) => {
    let variant = 'secondary';
    let text = status;
    let icon = null;
    switch (status) {
        case 'queued':
            variant = 'outline';
            text = 'Queued';
            icon = <lucide_react_1.Clock className="mr-1.5 h-3 w-3"/>;
            break;
        case 'running':
            variant = 'secondary';
            text = 'Running';
            icon = <lucide_react_1.Loader2 className="mr-1.5 h-3 w-3 animate-spin"/>;
            break;
        case 'succeeded':
            variant = 'default';
            text = 'Succeeded';
            icon = <lucide_react_1.CheckCircle2 className="mr-1.5 h-3 w-3"/>;
            break;
        case 'failed':
            variant = 'destructive';
            text = 'Failed';
            icon = <lucide_react_1.XCircle className="mr-1.5 h-3 w-3"/>;
            break;
    }
    return (<Badge_1.Badge variant={variant} className="pl-2 pr-2.5">
      {icon}
      {text}
    </Badge_1.Badge>);
});
// Helper to pretty-print artifact data
function formatArtifactData(data) {
    if (typeof data === 'string') {
        return data;
    }
    try {
        return JSON.stringify(data, null, 2);
    }
    catch {
        return String(data);
    }
}
function CopyButton({ text, className, }) {
    const [copied, setCopied] = (0, react_1.useState)(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to copy text', err);
        }
    };
    return (<Button_1.Button variant="ghost" size="icon" className={className} onClick={handleCopy} aria-label={copied ? 'Copied' : 'Copy to clipboard'} title={copied ? 'Copied!' : 'Copy to clipboard'}>
      {copied ? <lucide_react_1.Check className="h-3.5 w-3.5"/> : <lucide_react_1.Copy className="h-3.5 w-3.5"/>}
    </Button_1.Button>);
}
exports.RunSummary = React.memo(({ selectedRun }) => {
    return (<Card_1.Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
      <Card_1.CardHeader className="flex flex-row items-center justify-between">
        <Card_1.CardTitle className="flex items-center gap-2 text-slate-50">
          <lucide_react_1.FileSearch className="h-5 w-5"/>
          Run Summary
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-3 text-sm text-slate-200">
        {!selectedRun && (<p className="text-slate-400 text-xs">
            Submit a request to see run details, tasks, and cost summary.
          </p>)}

        {selectedRun && (<>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Run ID
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  {selectedRun.run.id}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Created At
                </span>
                <span className="text-xs">
                  {new Date(selectedRun.run.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
                  <lucide_react_1.DollarSign className="h-3 w-3"/>
                  Estimated Cost
                </span>
                <span className="font-semibold text-sm">
                  ${selectedRun.costSummary.totalCostUSD.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Input tokens</span>
                <span>
                  {selectedRun.costSummary.totalInputTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Output tokens</span>
                <span>
                  {selectedRun.costSummary.totalOutputTokens.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                By model
              </p>
              <div className="space-y-1">
                {Object.entries(selectedRun.costSummary.byModel).map(([model, stats]) => (<div key={model} className="flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-slate-300">
                          {model}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          in: {stats.inputTokens.toLocaleString()} • out:{' '}
                          {stats.outputTokens.toLocaleString()}
                        </span>
                      </div>
                      <span className="font-semibold">
                        ${stats.costUSD.toFixed(4)}
                      </span>
                    </div>))}
                {Object.keys(selectedRun.costSummary.byModel).length === 0 && (<p className="text-[11px] text-slate-500">
                    No model usage recorded for this run.
                  </p>)}
              </div>
            </div>
          </>)}
      </Card_1.CardContent>
    </Card_1.Card>);
});
exports.RunTasks = React.memo(({ selectedRun }) => {
    // Memoize the results map to optimize lookup from O(N) to O(1)
    const resultsMap = React.useMemo(() => {
        const map = new Map();
        if (selectedRun?.results) {
            for (const r of selectedRun.results) {
                map.set(r.task.id, r);
            }
        }
        return map;
    }, [selectedRun?.results]);
    const findResultForTask = (taskId) => resultsMap.get(taskId);
    return (<Card_1.Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
      <Card_1.CardHeader className="flex flex-row items-center justify-between">
        <Card_1.CardTitle className="flex items-center gap-2 text-slate-50">
          <lucide_react_1.Terminal className="h-5 w-5"/>
          Tasks
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="p-0">
        <scroll_area_1.ScrollArea className="h-[280px]">
          <div className="divide-y divide-slate-800/70">
            {!selectedRun && (<div className="p-4 text-xs text-slate-400">
                No tasks yet. Submit a request to see Maestro’s plan and
                execution.
              </div>)}

            {selectedRun &&
            selectedRun.tasks.map(task => {
                const result = findResultForTask(task.id);
                return (<div key={task.id} className="p-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-100">
                          {task.description}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {task.id}
                        </span>
                      </div>
                      <exports.TaskStatusBadge status={task.status}/>
                    </div>

                    {result?.task.errorMessage && (<p className="mt-1 text-[11px] text-red-400">
                        Error: {result.task.errorMessage}
                      </p>)}
                  </div>);
            })}
          </div>
        </scroll_area_1.ScrollArea>
      </Card_1.CardContent>
    </Card_1.Card>);
});
exports.RunOutputs = React.memo(({ selectedRun }) => {
    return (<Card_1.Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
      <Card_1.CardHeader className="flex flex-row items-center justify-between">
        <Card_1.CardTitle className="flex items-center gap-2 text-slate-50">
          <lucide_react_1.Terminal className="h-5 w-5"/>
          Outputs
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="p-0">
        <scroll_area_1.ScrollArea className="h-[280px]">
          <div className="divide-y divide-slate-800/70">
            {!selectedRun && (<div className="p-4 text-xs text-slate-400">
                Task outputs from Maestro will appear here once a run has
                completed.
              </div>)}

            {selectedRun &&
            selectedRun.results.map(result => (<div key={result.task.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-100">
                        {result.task.description}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Task {result.task.id}
                      </span>
                    </div>
                    <exports.TaskStatusBadge status={result.task.status}/>
                  </div>

                  {result.artifact ? (<div className="relative group">
                      <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-slate-900/80 p-3 text-[11px] leading-relaxed text-slate-100 pr-10">
                        {formatArtifactData(result.artifact.data)}
                      </pre>
                      <CopyButton text={formatArtifactData(result.artifact.data)} className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 h-7 w-7"/>
                    </div>) : (<p className="mt-1 text-[11px] text-slate-500">
                      No artifact produced for this task.
                    </p>)}
                </div>))}
          </div>
        </scroll_area_1.ScrollArea>
      </Card_1.CardContent>
    </Card_1.Card>);
});
