import { Switchboard } from '../lib/switchboard.js';
import { createDefaultChecklist, serializeChecklist } from '../lib/checklist.js';
import { ensureSession } from '../lib/session.js';

export interface PlanOptions {
  task: string;
  session?: string;
}

export function runPlan(options: PlanOptions) {
  const session = ensureSession({ sessionId: options.session });
  const switchboard = new Switchboard(session);

  const checklist = createDefaultChecklist(options.task);
  const checklistYaml = serializeChecklist(checklist);
  const planPayload = {
    task: options.task,
    checklist: session.checklistPath,
    generatedAt: new Date().toISOString(),
  };

  switchboard.writeFile(session.checklistPath, checklistYaml);
  switchboard.writeFile(session.planPath, JSON.stringify(planPayload, null, 2));
  switchboard.writeFile(
    session.summaryPath,
    `# Summit Agent Plan\n\nTask: ${options.task}\n\nChecklist: ${session.checklistPath}\n`,
  );
  switchboard.recordNote('Plan generated with checklist and summary.');

  return session;
}
