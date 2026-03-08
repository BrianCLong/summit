import * as React from 'react';
import { useState } from 'react';
import type { MaestroRunResponse, TaskResult } from '@/types/maestro';

import {
  Loader2,
  Terminal,
  FileSearch,
  DollarSign,
  Copy,
  Check,
  XCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper component for task status badge
export const TaskStatusBadge: React.FC<{ status: string }> = React.memo(({ status }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  let text = status;
  let icon = null;

  switch (status) {
    case 'queued':
      variant = 'outline';
      text = 'Queued';
      icon = <Clock className="mr-1.5 h-3 w-3" />;
      break;
    case 'running':
      variant = 'secondary';
      text = 'Running';
      icon = <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />;
      break;
    case 'succeeded':
      variant = 'default';
      text = 'Succeeded';
      icon = <CheckCircle2 className="mr-1.5 h-3 w-3" />;
      break;
    case 'failed':
      variant = 'destructive';
      text = 'Failed';
      icon = <XCircle className="mr-1.5 h-3 w-3" />;
      break;
  }

  return (
    <Badge variant={variant} className="pl-2 pr-2.5">
      {icon}
      {text}
    </Badge>
  );
});

// Helper to pretty-print artifact data
export function formatArtifactData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy text', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

interface RunPartProps {
  selectedRun: MaestroRunResponse | null;
}

export const RunSummary: React.FC<RunPartProps> = React.memo(({ selectedRun }) => {
  return (
    <Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <FileSearch className="h-5 w-5" />
          Run Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-200">
        {!selectedRun && (
          <p className="text-slate-400 text-xs">
            Submit a request to see run details, tasks, and cost summary.
          </p>
        )}

        {selectedRun && (
          <>
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
                  <DollarSign className="h-3 w-3" />
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
                {Object.entries(selectedRun.costSummary.byModel).map(
                  ([model, stats]) => (
                    <div
                      key={model}
                      className="flex items-center justify-between text-xs"
                    >
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
                    </div>
                  ),
                )}
                {Object.keys(selectedRun.costSummary.byModel).length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No model usage recorded for this run.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

export const RunTasks: React.FC<RunPartProps> = React.memo(({ selectedRun }) => {
  // Memoize the results map to optimize lookup from O(N) to O(1)
  const resultsMap = React.useMemo(() => {
    const map = new Map<string, TaskResult>();
    if (selectedRun?.results) {
      for (const r of selectedRun.results) {
        map.set(r.task.id, r);
      }
    }
    return map;
  }, [selectedRun?.results]);

  const findResultForTask = (taskId: string): TaskResult | undefined =>
    resultsMap.get(taskId);

  return (
    <Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <Terminal className="h-5 w-5" />
          Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="divide-y divide-slate-800/70">
            {!selectedRun && (
              <div className="p-4 text-xs text-slate-400">
                No tasks yet. Submit a request to see Maestro’s plan and
                execution.
              </div>
            )}

            {selectedRun &&
              selectedRun.tasks.map(task => {
                const result = findResultForTask(task.id);

                return (
                  <div key={task.id} className="p-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-100">
                          {task.description}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {task.id}
                        </span>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </div>

                    {result?.task.errorMessage && (
                      <p className="mt-1 text-[11px] text-red-400">
                        Error: {result.task.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

export const RunOutputs: React.FC<RunPartProps> = React.memo(({ selectedRun }) => {
  return (
    <Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <Terminal className="h-5 w-5" />
          Outputs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="divide-y divide-slate-800/70">
            {!selectedRun && (
              <div className="p-4 text-xs text-slate-400">
                Task outputs from Maestro will appear here once a run has
                completed.
              </div>
            )}

            {selectedRun &&
              selectedRun.results.map(result => (
                <div key={result.task.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-100">
                        {result.task.description}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Task {result.task.id}
                      </span>
                    </div>
                    <TaskStatusBadge status={result.task.status} />
                  </div>

                  {result.artifact ? (
                    <div className="relative group">
                      <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-slate-900/80 p-3 text-[11px] leading-relaxed text-slate-100 pr-10">
                        {formatArtifactData(result.artifact.data)}
                      </pre>
                      <CopyButton
                        text={formatArtifactData(result.artifact.data)}
                        className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 h-7 w-7"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      No artifact produced for this task.
                    </p>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
