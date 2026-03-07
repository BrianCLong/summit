import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function spawnTmuxWorker(session: string, worker: string, cmd: string[]) {
  // Try to use execa equivalent via child_process.
  // Note: For CI compatibility we may fall back to direct execution if tmux isn't present.
  try {
    const { stdout, stderr } = await execAsync(`tmux new-window -t ${session} -n ${worker} "${cmd.join(' ')}"`);
    return { exitCode: 0, stdout, stderr };
  } catch (error: any) {
    if (error.message.includes('tmux') || error.message.includes('server')) {
      // Fallback for CI environments where tmux isn't available
      try {
        const { stdout, stderr } = await execAsync(cmd.join(' '));
        return { exitCode: 0, stdout, stderr };
      } catch (innerError: any) {
         return { exitCode: innerError.code || 1, stdout: innerError.stdout || '', stderr: innerError.stderr || '' };
      }
    }
    return { exitCode: error.code || 1, stdout: error.stdout || '', stderr: error.stderr || '' };
  }
}
