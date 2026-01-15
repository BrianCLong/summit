import { ensureSession } from '../lib/session.js';
import { Switchboard } from '../lib/switchboard.js';

export interface RunOptions {
  session?: string;
  command?: string;
}

export function runExecution(options: RunOptions) {
  const session = ensureSession({ sessionId: options.session });
  const switchboard = new Switchboard(session);

  if (options.command) {
    switchboard.recordNote(`Executing command from run: ${options.command}`);
    const result = switchboard.runShellCommand(options.command);
    return { session, exitCode: result.status ?? 0 };
  }

  switchboard.recordNote(
    'No execution command provided. Deferred pending explicit run steps.',
  );

  return { session, exitCode: 0 };
}
