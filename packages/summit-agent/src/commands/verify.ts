import { ensureSession } from '../lib/session.js';
import { Switchboard } from '../lib/switchboard.js';
import { loadChecklist } from '../lib/checklist.js';
import {
  ChecklistReport,
  ChecklistItemResult,
  ChecklistVerifierResult,
} from '../lib/types.js';

export interface VerifyOptions {
  session?: string;
}

export function runVerify(options: VerifyOptions) {
  const session = ensureSession({ sessionId: options.session });
  const switchboard = new Switchboard(session);
  const checklist = loadChecklist(session.checklistPath);

  const verifierResults: ChecklistVerifierResult[] = checklist.verifiers.map(
    (verifier) => {
      if (!verifier.command) {
        return {
          id: verifier.id,
          status: 'fail',
          reason: 'Verifier missing command.',
        };
      }

      const result = switchboard.runShellCommand(verifier.command);
      const status = result.status === 0 ? 'pass' : 'fail';

      return {
        id: verifier.id,
        status,
        command: verifier.command,
        exitCode: result.status ?? 0,
      };
    },
  );

  const verifierStatusMap = new Map(
    verifierResults.map((result) => [result.id, result]),
  );

  const itemResults: ChecklistItemResult[] = checklist.items.map((item) => {
    const failedVerifiers = item.requiredVerifiers.filter((verifierId) => {
      const verifier = verifierStatusMap.get(verifierId);
      return !verifier || verifier.status !== 'pass';
    });

    return {
      id: item.id,
      title: item.title,
      requiredVerifiers: item.requiredVerifiers,
      failedVerifiers,
      status: failedVerifiers.length === 0 ? 'pass' : 'fail',
    };
  });

  const reportStatus = itemResults.every((item) => item.status === 'pass')
    ? 'pass'
    : 'fail';

  const report: ChecklistReport = {
    task: checklist.task,
    sessionId: session.id,
    status: reportStatus,
    generatedAt: new Date().toISOString(),
    verifierResults,
    itemResults,
  };

  switchboard.writeFile(
    session.checklistReportJsonPath,
    JSON.stringify(report, null, 2),
  );

  switchboard.writeFile(
    session.checklistReportMdPath,
    formatChecklistReport(report),
  );

  switchboard.recordNote(`Verification ${reportStatus}.`);

  return { session, report, exitCode: reportStatus === 'pass' ? 0 : 1 };
}

function formatChecklistReport(report: ChecklistReport): string {
  const verifierLines = report.verifierResults
    .map((result) => {
      const detail = result.command ? ` (${result.command})` : '';
      return `- ${result.id}: ${result.status}${detail}`;
    })
    .join('\n');

  const itemLines = report.itemResults
    .map((result) => {
      const failed =
        result.failedVerifiers.length > 0
          ? ` (failed: ${result.failedVerifiers.join(', ')})`
          : '';
      return `- ${result.title}: ${result.status}${failed}`;
    })
    .join('\n');

  return [
    '# Checklist Report',
    '',
    `Status: ${report.status}`,
    '',
    '## Verifiers',
    verifierLines,
    '',
    '## Items',
    itemLines,
    '',
  ].join('\n');
}
