import { InteractionChunk, TrajectoryStep } from './types.js';

export interface ChunkerOptions {
  idleBoundarySeconds?: number;
}

const DEFAULT_IDLE_SECONDS = 15;

const isCommitBoundary = (step: TrajectoryStep, idleExceeded: boolean): boolean => {
  if (step.kind === 'final' || step.kind === 'artifact') return true;
  if (step.metadata?.commitBoundary === true) return true;
  if (step.metadata?.user_visible === true) return true;
  if (idleExceeded) return true;
  if (step.metadata?.goal_shift === true) return true;
  return false;
};

const isChunkStarter = (step: TrajectoryStep): boolean => {
  if (step.role === 'user') return true;
  if (step.kind === 'tool_invocation') return true;
  return false;
};

const toolFromStep = (step: TrajectoryStep): string | undefined => {
  if (step.kind === 'tool_invocation' || step.kind === 'tool_result') {
    if (typeof step.name === 'string') return step.name;
    if (typeof step.metadata?.tool === 'string') return step.metadata.tool;
  }
  return undefined;
};

export function chunkTrajectory(steps: TrajectoryStep[], options: ChunkerOptions = {}): InteractionChunk[] {
  if (steps.length === 0) return [];
  const idleBoundaryMs = (options.idleBoundarySeconds ?? DEFAULT_IDLE_SECONDS) * 1000;
  const chunks: InteractionChunk[] = [];
  let currentChunkStart = 0;
  let tools = new Set<string>();
  let lastTs: number | null = null;

  const flush = (endIndex: number) => {
    const relevantSteps = steps.slice(currentChunkStart, endIndex + 1);
    const duration = calculateDuration(relevantSteps);
    const summaryCandidate = relevantSteps.find((s) => typeof s.metadata?.summary === 'string');
    const summary = typeof summaryCandidate?.metadata?.summary === 'string' ? summaryCandidate.metadata.summary : undefined;
    chunks.push({
      chunk_id: `chunk-${chunks.length + 1}`,
      step_start: currentChunkStart,
      step_end: endIndex,
      duration_ms: duration,
      tools_used: Array.from(tools),
      success_signal: relevantSteps.some((step) => step.metadata?.success === true || step.kind === 'final'),
      summary,
    });
    tools = new Set<string>();
  };

  steps.forEach((step, index) => {
    const stepTs = typeof step.ts === 'string' ? Date.parse(step.ts) : step.ts;
    const idleExceeded = lastTs !== null && stepTs - lastTs > idleBoundaryMs;
    if (index !== 0 && (isChunkStarter(step) || isCommitBoundary(step, idleExceeded))) {
      flush(index - 1);
      currentChunkStart = index;
    }
    const maybeTool = toolFromStep(step);
    if (maybeTool) {
      tools.add(maybeTool);
    }
    lastTs = stepTs;
    if (index === steps.length - 1) {
      flush(index);
    }
  });

  return chunks;
}

function calculateDuration(steps: TrajectoryStep[]): number | undefined {
  const tsValues = steps
    .map((s) => (typeof s.ts === 'string' ? Date.parse(s.ts) : s.ts))
    .filter((v) => Number.isFinite(v));
  if (tsValues.length < 2) return steps[steps.length - 1]?.duration_ms;
  return tsValues[tsValues.length - 1] - tsValues[0];
}
