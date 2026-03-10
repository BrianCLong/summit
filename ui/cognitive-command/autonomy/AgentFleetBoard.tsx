import React from 'react';
import type { AutonomousTask, AgentStatus } from '../types';

const STATUS_STYLES: Record<AgentStatus, { bg: string; text: string; dot: string }> = {
  idle: { bg: 'bg-zinc-800', text: 'text-zinc-400', dot: 'bg-zinc-500' },
  running: { bg: 'bg-cyan-950', text: 'text-cyan-300', dot: 'bg-cyan-500' },
  paused: { bg: 'bg-amber-950', text: 'text-amber-300', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-950', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  failed: { bg: 'bg-red-950', text: 'text-red-300', dot: 'bg-red-500' },
  awaiting_approval: { bg: 'bg-violet-950', text: 'text-violet-300', dot: 'bg-violet-500' },
  escalated: { bg: 'bg-orange-950', text: 'text-orange-300', dot: 'bg-orange-500' },
};

export function AgentFleetBoard() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">All active agents and missions</span>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" /> Running
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Awaiting
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Escalated
          </span>
        </div>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[150px]">
        <p className="text-xs text-zinc-500">Agent cards showing: task, status, confidence, evidence count, model/runtime, recent actions, policy state, and escalation reason. Each card supports approve/reject/pause actions.</p>
      </div>
    </div>
  );
}
