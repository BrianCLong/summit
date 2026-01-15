import { readFileSync } from 'fs';
import { ensureSession, findLatestSession } from '../lib/session.js';
import { Switchboard } from '../lib/switchboard.js';
import { ChecklistReport } from '../lib/types.js';

export interface ShipOptions {
  session?: string;
}

export function runShip(options: ShipOptions) {
  const sessionId = options.session ?? findLatestSession();

  if (!sessionId) {
    throw new Error('No summit-agent session found to ship.');
  }

  const session = ensureSession({ sessionId });
  const switchboard = new Switchboard(session);

  const reportContents = readFileSync(session.checklistReportJsonPath, 'utf8');
  const report = JSON.parse(reportContents) as ChecklistReport;

  if (report.status !== 'pass') {
    switchboard.recordNote('Ship blocked: verification failed.');
    return { session, report, exitCode: 1 };
  }

  const gitStatus = switchboard.runShellCommand('git status --porcelain');
  if (gitStatus.status !== 0) {
    switchboard.recordNote('Ship blocked: git status failed.');
    return { session, report, exitCode: 1 };
  }

  switchboard.recordNote('Ship gate passed. Ready for PR creation.');
  return { session, report, exitCode: 0 };
}
