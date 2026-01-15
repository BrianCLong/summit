import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { appendReceipt } from './receipts.js';
import { SessionPaths } from './types.js';

export class Switchboard {
  constructor(private readonly session: SessionPaths) {}

  runShellCommand(command: string, options: { cwd?: string } = {}) {
    const start = process.hrtime.bigint();
    const result = spawnSync(command, {
      cwd: options.cwd,
      shell: true,
      encoding: 'utf8',
    });
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    appendReceipt(this.session, {
      type: 'command',
      command,
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      durationMs,
      shell: true,
    });

    return result;
  }

  recordNote(message: string) {
    appendReceipt(this.session, {
      type: 'note',
      message,
    });
  }

  writeFile(path: string, contents: string) {
    writeFileSync(path, contents, 'utf8');
    appendReceipt(this.session, {
      type: 'file_write',
      path,
      bytes: Buffer.byteLength(contents, 'utf8'),
    });
  }
}
