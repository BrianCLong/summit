import { useMemo } from 'react';
import type { IntelGraphClient, IntelGraphNode } from '../integration/intelgraphTypes';

export interface InvestigationMemoryRecord {
  investigationId: string;
  entities: IntelGraphNode[];
  events: IntelGraphNode[];
  hypotheses: Array<{ id: string; statement: string; status: 'open' | 'supported' | 'rejected' }>;
  evidence: Array<{ id: string; sourceId: string; summary: string }>;
  analystNotes: Array<{ id: string; text: string; createdAt: string }>;
  agentFindings: Array<{ id: string; agentId: string; finding: string; createdAt: string }>;
  timeline: Array<{ id: string; title: string; timestamp: string; category: string }>;
}

interface InvestigationMemoryProps {
  memory: InvestigationMemoryRecord;
  intelGraphClient: IntelGraphClient;
}

export function InvestigationMemory({ memory }: InvestigationMemoryProps) {
  const summary = useMemo(
    () => ({
      entities: memory.entities.length,
      events: memory.events.length,
      hypotheses: memory.hypotheses.length,
      evidence: memory.evidence.length,
    }),
    [memory],
  );

  return (
    <section aria-label="investigation-memory">
      <h2>Investigation Memory</h2>
      <p>Investigation: {memory.investigationId}</p>
      <ul>
        <li>Entities: {summary.entities}</li>
        <li>Events: {summary.events}</li>
        <li>Hypotheses: {summary.hypotheses}</li>
        <li>Evidence items: {summary.evidence}</li>
      </ul>
    </section>
  );
}
