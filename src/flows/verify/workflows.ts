import { listFilesRecursively, toPosixRelative } from '../io';
import { inspectStepFunctionWorkflow } from '../extract/stepfunctions';

export interface WorkflowMismatch {
  workflow: string;
  expectedFinalEvent: string;
  observedFinalEvent: string;
  source: string;
}

export function findWorkflowMismatches(workspace: string): WorkflowMismatch[] {
  const files = listFilesRecursively(workspace, {
    include: /\.asl\.json$/i,
    exclude: /node_modules|\.git|dist|build|coverage/i,
  });

  const mismatches: WorkflowMismatch[] = [];

  for (const filePath of files) {
    let observations = [] as ReturnType<typeof inspectStepFunctionWorkflow>;
    try {
      observations = inspectStepFunctionWorkflow(filePath);
    } catch {
      continue;
    }

    for (const observation of observations) {
      if (
        observation.expectedFinalEvent !== 'unknown' &&
        observation.observedFinalEvent !== observation.expectedFinalEvent
      ) {
        mismatches.push({
          workflow: observation.workflow,
          expectedFinalEvent: observation.expectedFinalEvent,
          observedFinalEvent: observation.observedFinalEvent,
          source: toPosixRelative(workspace, observation.source),
        });
      }
    }
  }

  return mismatches.sort((a, b) => a.workflow.localeCompare(b.workflow));
}
