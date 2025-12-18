// src/components/MaestroRunConsole.tsx

import * as React from 'react';
import { useState } from 'react';
import { useMaestroRun } from '@/hooks/useMaestroRun';
import type { MaestroRunResponse, TaskResult } from '@/types/maestro';

import { Play, Loader2, Terminal, FileSearch, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';

interface MaestroRunConsoleProps {
  /** Current user id or workspace/user surrogate */
  userId: string;
}

export const MaestroRunConsole: React.FC<MaestroRunConsoleProps> = ({
  userId,
}) => {
  const [input, setInput] = useState('');
  const { state, run, reset } = useMaestroRun(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await run(input);
  };

  const handleReset = () => {
    setInput('');
    reset();
  };

  const renderTaskStatus = (status: string) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      'secondary';
    let text = status;

    switch (status) {
      case 'queued':
        variant = 'outline';
        text = 'Queued';
        break;
      case 'running':
        variant = 'secondary';
        text = 'Running';
        break;
      case 'succeeded':
        variant = 'default';
        text = 'Succeeded';
        break;
      case 'failed':
        variant = 'destructive';
        text = 'Failed';
        break;
    }

    return <Badge variant={variant}>{text}</Badge>;
  };

  const selectedRun: MaestroRunResponse | null = state.data;

  const findResultForTask = (taskId: string): TaskResult | undefined =>
    selectedRun?.results.find(r => r.task.id === taskId);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Top row: input + summary */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-50">
              <Terminal className="h-5 w-5" />
              Maestro Run Console
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Describe what you want Maestro to do. Example: 'Review the last 5 PRs, summarize risk, and propose a follow-up CI improvement.'"
                className="min-h-[120px] resize-none text-sm"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected as <span className="font-mono">{userId}</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedRun && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={state.isRunning || !input.trim()}
                    className="gap-2"
                  >
                    {state.isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running…
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run with Maestro
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {state.error && (
                <p className="text-xs text-red-400 mt-1">{state.error}</p>
              )}
            </form>
          </CardContent>
        </Card>

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
                      {new Date(
                        selectedRun.run.createdAt,
                      ).toLocaleString()}
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
                      $
                      {selectedRun.costSummary.totalCostUSD.toFixed(4)}
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
                              in:{' '}
                              {stats.inputTokens.toLocaleString()} • out:{' '}
                              {stats.outputTokens.toLocaleString()}
                            </span>
                          </div>
                          <span className="font-semibold">
                            ${stats.costUSD.toFixed(4)}
                          </span>
                        </div>
                      ),
                    )}
                    {Object.keys(selectedRun.costSummary.byModel).length ===
                      0 && (
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
      </div>

      {/* Bottom: tasks & outputs */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
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
                          {renderTaskStatus(task.status)}
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
                        {renderTaskStatus(result.task.status)}
                      </div>

                      {result.artifact ? (
                        <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-slate-900/80 p-3 text-[11px] leading-relaxed text-slate-100">
                          {formatArtifactData(result.artifact.data)}
                        </pre>
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
      </div>
    </div>
  );
};

// Helper to pretty-print artifact data
function formatArtifactData(data: unknown): string {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
