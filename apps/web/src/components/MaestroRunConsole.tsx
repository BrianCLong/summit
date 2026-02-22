// src/components/MaestroRunConsole.tsx

import * as React from 'react';
import { useState, useRef } from 'react';
import { useMaestroRun } from '@/hooks/useMaestroRun';
import type { MaestroRunResponse } from '@/types/maestro';

import {
  Play,
  Loader2,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { isMac } from '@/lib/utils';

import { RunSummary, RunTasks, RunOutputs } from './MaestroRunConsoleParts';

interface MaestroRunConsoleProps {
  /** Current user id or workspace/user surrogate */
  userId: string;
}

export const MaestroRunConsole: React.FC<MaestroRunConsoleProps> = ({
  userId,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { state, run, reset } = useMaestroRun(userId);

  const QUICK_PROMPTS = [
    'Analyze the last 3 PRs for security risks',
    'Summarize recent deployment failures',
    'Draft a release note for the latest commit',
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!input.trim()) {
      return;
    }
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
  };

  const selectedRun: MaestroRunResponse | null = state.data;

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
                  ref={textareaRef}
                  id="maestro-prompt"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want Maestro to do. Example: 'Review the last 5 PRs, summarize risk, and propose a follow-up CI improvement.'"
                  className="min-h-[120px] resize-none text-sm"
                />

                {!input && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-medium text-slate-500">
                      Try:
                    </span>
                    {QUICK_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setInput(prompt);
                          textareaRef.current?.focus();
                        }}
                        aria-label={`Use prompt: ${prompt}`}
                        className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
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
                    <kbd className="font-sans border border-slate-700 rounded px-1.5 py-0.5 text-[10px] bg-slate-900/50 text-slate-400 shadow-sm">
                      {isMac ? '⌘' : 'Ctrl'}+Enter
                    </kbd>
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

        <RunSummary selectedRun={selectedRun} />
      </div>

      {/* Bottom: tasks & outputs */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
        <RunTasks selectedRun={selectedRun} />
        <RunOutputs selectedRun={selectedRun} />
      </div>
    </div>
  );
};
