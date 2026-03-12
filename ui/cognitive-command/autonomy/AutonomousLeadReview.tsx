import React from 'react';
import type { AgentOutput } from '../types';

export function AutonomousLeadReview() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Review agent-generated leads and findings</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Compare agent findings against human assessments. Route validated outputs into investigation memory and insights. Shows finding type, confidence, and evidence links.</p>
      </div>
    </div>
  );
}
