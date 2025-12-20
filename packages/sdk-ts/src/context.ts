import type { RunContext } from './types.js';

export function createRunContext(partial: Partial<RunContext>): RunContext {
  const noop = () => {};
  return {
    runId: partial.runId ?? 'local',
    workflowRef: partial.workflowRef ?? 'local',
    namespace: partial.namespace ?? 'dev',
    correlation: partial.correlation ?? {},
    logger: partial.logger ?? { info: noop, error: noop },
    secrets: partial.secrets ?? (async () => ''),
    emit: partial.emit ?? (async () => {}),
    policy: partial.policy,
  };
}
