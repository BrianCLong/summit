import { createHash } from 'crypto';
import { writeEvidenceBundle, EvidenceMetrics, EvidenceReport } from '../evidence/writeBundle';
import { NormalizedOpsEvent } from './types';

export type TraceBundleResult = {
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  outputDir: string;
};

const TRACE_ENABLED = () => process.env.AGENT_TRACE_ENABLED === 'true';

const stableOpId = (
  sessionId: string | undefined,
  index: number,
  type: string,
): string =>
  createHash('sha256')
    .update(`${sessionId ?? 'no-session'}:${index}:${type}`)
    .digest('hex')
    .slice(0, 16);

const detectAgentCycles = (): boolean => false;

export const buildTraceReport = (
  evidenceId: string,
  events: NormalizedOpsEvent[],
  summary = 'ops trace evidence',
): EvidenceReport => ({
  evidence_id: evidenceId,
  summary,
  ops: events.map((event, index) => ({
    id: stableOpId(event.sessionId, index, event.type),
    type: event.type,
    toolName: event.toolName,
    toolInput: event.toolInput,
    toolOutput: event.toolOutput,
    sessionId: event.sessionId,
    directory: event.directory,
  })),
});

export const buildTraceMetrics = (
  events: NormalizedOpsEvent[],
): EvidenceMetrics => ({
  event_count: events.length,
  tool_use_count: events.filter((event) => event.type === 'ToolUse').length,
  agent_cycles_detected: detectAgentCycles(),
  policy_violations_count: 0,
});

export const writeTraceEvidenceBundle = async ({
  evidenceId,
  events,
  summary,
  outputRoot,
  timestamp,
}: {
  evidenceId: string;
  events: NormalizedOpsEvent[];
  summary?: string;
  outputRoot?: string;
  timestamp?: string;
}): Promise<TraceBundleResult> => {
  if (!TRACE_ENABLED()) {
    throw new Error('AGENT_TRACE_ENABLED is false');
  }

  const report = buildTraceReport(evidenceId, events, summary);
  const metrics = buildTraceMetrics(events);
  const { bundleDir } = await writeEvidenceBundle({
    evidenceId,
    report,
    metrics,
    outputRoot,
    timestamp,
  });

  return { report, metrics, outputDir: bundleDir };
};
