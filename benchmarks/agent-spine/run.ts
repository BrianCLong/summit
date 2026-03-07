import { SpineTask, SpineResult } from './schema';
import { scoreTask } from './score';

export function runDeterministicTask(task: SpineTask): SpineResult {
  const trace = task.tool_trace.map((t, i) => ({
    step: i + 1,
    tool: t.tool,
    output_ref: t.output_ref,
  }));

  const evidence_ids = task.expected_evidence.map(
    (id, i) => `EVID:${task.suite}:${task.case_id}:step:${i + 1}:${id}`
  );

  const { score, passed } = scoreTask(task);

  return {
    schema_version: "1",
    suite: task.suite,
    case_id: task.case_id,
    score,
    passed,
    evidence_ids,
    trace,
  };
}
