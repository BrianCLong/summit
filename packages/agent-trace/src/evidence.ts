import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface EvidenceItem {
  evidence_id: string;
  summary: string;
  artifacts: string[];
  results?: any[];
}

export function emitEvidence(baseDir: string, items: EvidenceItem[], metrics: Record<string, number>) {
  const agentTraceDir = join(baseDir, 'evidence/agent_trace');
  mkdirSync(agentTraceDir, { recursive: true });

  // Report
  const report = {
    evidence_id: 'EVD-AGENTTRACE-REPORT',
    summary: 'Agent Trace validation and policy report',
    artifacts: items.flatMap(i => i.artifacts),
    items
  };
  writeFileSync(join(agentTraceDir, 'report.json'), JSON.stringify(report, null, 2));

  // Metrics
  writeFileSync(join(agentTraceDir, 'metrics.json'), JSON.stringify({ metrics }, null, 2));

  // Stamp
  const stamp = {
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  };
  writeFileSync(join(agentTraceDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // Index
  const index = {
    items: [
      { evidence_id: 'EVD-AGENTTRACE-REPORT', path: 'evidence/agent_trace/report.json' },
      { evidence_id: 'EVD-AGENTTRACE-METRICS', path: 'evidence/agent_trace/metrics.json' },
      { evidence_id: 'EVD-AGENTTRACE-STAMP', path: 'evidence/agent_trace/stamp.json' }
    ]
  };
  writeFileSync(join(agentTraceDir, 'index.json'), JSON.stringify(index, null, 2));
}
