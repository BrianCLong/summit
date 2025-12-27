// src/components/MaestroRunConsole.tsx

import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useMaestroRun } from '@/hooks/useMaestroRun';
import type { MaestroRunResponse, TaskResult } from '@/types/maestro';

import { Play, Loader2, Terminal, FileSearch, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAgUiAgent } from '@/agent/useAgUiAgent';
import { SharedStateSchema, type AgentEvent } from '@/agent/agentTypes';
import {
  pushEvent,
  resetAgentRun,
  setShared,
  setStatus,
  setThreadId,
} from '@/agent/agentRunSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  CONTEXT_SKILLS,
  type ContextSkill,
  archivePrompt,
  listPromptArchive,
} from '@/lib/promptArchive';

interface MaestroRunConsoleProps {
  /** Current user id or workspace/user surrogate */
  userId: string;
  agentUrl?: string;
  threadId?: string;
}

export const MaestroRunConsole: React.FC<MaestroRunConsoleProps> = ({
  userId,
  agentUrl,
  threadId,
}) => {
  const [input, setInput] = useState('');
  const [improvements, setImprovements] = useState('');
  const [tuningNotes, setTuningNotes] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<ContextSkill[]>([]);
  const [archiveEntries, setArchiveEntries] = useState(() =>
    listPromptArchive(6),
  );
  const { state, run, reset } = useMaestroRun(userId);
  const dispatch = useAppDispatch();
  const events = useAppSelector(state => state.agentRun.events);
  const sharedState = useAppSelector(state => state.agentRun.shared);
  const status = useAppSelector(state => state.agentRun.status);
  const thread = useAppSelector(state => state.agentRun.threadId);
  const eventsRef = useRef<HTMLDivElement>(null);

  const agent = useAgUiAgent({
    url: agentUrl,
    threadId,
    onThread: id => dispatch(setThreadId(id)),
    onState: shared => {
      const parsed = SharedStateSchema.safeParse(shared);
      if (parsed.success) {
        dispatch(setShared(parsed.data));
      } else {
        dispatch(
          pushEvent({
            type: 'error',
            message: 'Rejected invalid shared state update',
            t: Date.now(),
          }),
        );
      }
    },
    onEvent: event => {
      const payload: AgentEvent = { ...event, t: Date.now() };
      dispatch(pushEvent(payload));
      if (payload.type === 'status') {
        dispatch(setStatus(payload.value));
      }
      if (eventsRef.current) {
        eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
      }
    },
    onError: error => {
      dispatch(setStatus('error'));
      dispatch(
        pushEvent({
          type: 'error',
          message: error.message,
          t: Date.now(),
        }),
      );
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    archivePrompt({
      prompt: input.trim(),
      summary: input.trim().slice(0, 140),
      tags: ['maestro', 'run-console'],
      improvements,
      tuningNotes,
      contextSkills: selectedSkills,
    });
    setArchiveEntries(listPromptArchive(6));
    await run(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReset = () => {
    setInput('');
    reset();
    dispatch(resetAgentRun());
    setImprovements('');
    setTuningNotes('');
    setSelectedSkills([]);
  };

  const formattedSharedState = useMemo(() => {
    if (!sharedState) return 'No shared state.';
    return JSON.stringify(sharedState, null, 2);
  }, [sharedState]);

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

  const toggleSkill = (skill: ContextSkill) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(item => item !== skill)
        : [...prev, skill],
    );
  };

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
              <div className="grid w-full gap-1.5">
                <Label htmlFor="maestro-prompt">Prompt</Label>
                <Textarea
                  id="maestro-prompt"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want Maestro to do. Example: 'Review the last 5 PRs, summarize risk, and propose a follow-up CI improvement.'"
                  className="min-h-[120px] resize-none text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs uppercase tracking-wide text-slate-400">
                  Context Skills (from Agent-Skills-for-Context-Engineering)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CONTEXT_SKILLS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition ${
                        selectedSkills.includes(skill)
                          ? 'border-emerald-400 text-emerald-200'
                          : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="maestro-improvements">
                    Improvements / Deltas
                  </Label>
                  <Textarea
                    id="maestro-improvements"
                    value={improvements}
                    onChange={e => setImprovements(e.target.value)}
                    placeholder="What changed since the last run? (policy notes, prompt deltas)"
                    className="min-h-[80px] resize-none text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="maestro-tuning">Tuning Notes</Label>
                  <Textarea
                    id="maestro-tuning"
                    value={tuningNotes}
                    onChange={e => setTuningNotes(e.target.value)}
                    placeholder="Tuning choices (temperature, tools, evaluation context)"
                    className="min-h-[80px] resize-none text-xs"
                  />
                </div>
              </div>

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
                  <span className="text-[10px] text-slate-500 hidden sm:inline-block mr-1">
                    ⌘+Enter
                  </span>
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

      <Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <Terminal className="h-5 w-5" />
            AG-UI Live Console
          </CardTitle>
          <Badge variant={agent.isConnected ? 'default' : 'outline'}>
            {agent.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-200">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Thread
              </div>
              <div className="font-mono text-xs text-slate-200">
                {thread ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Status
              </div>
              <div className="text-xs text-slate-200">{status}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Active Tool
              </div>
              <div className="text-xs text-slate-200">
                {sharedState?.activeTool ?? '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => agent.sendUserMessage('resume')}
            >
              Resume
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={agent.pause}
            >
              Pause
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={agent.retryLastTool}
            >
              Retry Tool
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded border border-slate-800/70 bg-slate-950/70">
              <div className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800/70">
                Event Stream
              </div>
              <div
                ref={eventsRef}
                className="max-h-64 overflow-auto px-3 py-2 text-xs font-mono"
              >
                {events.length === 0 && (
                  <div className="text-slate-500">
                    No live events yet.
                  </div>
                )}
                {events.map((event, index) => (
                  <div key={`${event.type}-${index}`} className="mb-1">
                    <span className="text-slate-500">
                      {event.t ? new Date(event.t).toLocaleTimeString() : '—'}
                    </span>{' '}
                    <span className="text-slate-200">{event.type}</span>{' '}
                    <span className="text-slate-400">
                      {event.type === 'message'
                        ? `${event.role}: ${event.content}`
                        : event.type === 'status'
                          ? event.value
                          : event.type === 'error'
                            ? event.message
                            : '…'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-slate-800/70 bg-slate-950/70">
              <div className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800/70">
                Shared State
              </div>
              <pre className="max-h-64 overflow-auto px-3 py-2 text-xs text-slate-200">
                {formattedSharedState}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border border-slate-800 bg-slate-950/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <Terminal className="h-5 w-5" />
            Prompt Archive & Retrieval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-200">
          {archiveEntries.length === 0 && (
            <p className="text-xs text-slate-400">
              No archived prompts yet. Submit a run to capture prompts, tunings,
              and improvements for replay.
            </p>
          )}
          {archiveEntries.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {archiveEntries.map(entry => (
                <div
                  key={entry.id}
                  className="rounded border border-slate-800/70 bg-slate-950/70 p-3"
                >
                  <div className="text-[11px] text-slate-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-200">
                    {entry.summary}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.contextSkills.map(skill => (
                      <span
                        key={skill}
                        className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setInput(entry.prompt)}
                    >
                      Load Prompt
                    </Button>
                    {entry.improvements && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setImprovements(entry.improvements)}
                      >
                        Load Improvements
                      </Button>
                    )}
                    {entry.tuningNotes && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setTuningNotes(entry.tuningNotes)}
                      >
                        Load Tuning
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
