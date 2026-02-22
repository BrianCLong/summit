import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SandboxProfile, SandboxResult } from './types';

const execFileAsync = promisify(execFile);
const FORBIDDEN_NETWORK_COMMANDS = ['curl', 'wget', 'nc', 'telnet'];

export const defaultSandboxProfile: SandboxProfile = {
  id: 'local-sandbox',
  timeoutMs: 120_000,
  networkEnabled: false,
};

const assertNetworkPolicy = (command: string, profile: SandboxProfile) => {
  if (!profile.networkEnabled) {
    const isForbidden = FORBIDDEN_NETWORK_COMMANDS.some((cmd) =>
      command.includes(cmd),
    );
    if (isForbidden) {
      throw new Error(`Network disabled for sandbox profile ${profile.id}`);
    }
  }
};

export const runSandboxCommand = async (
  command: string,
  args: string[],
  profile: SandboxProfile = defaultSandboxProfile,
  cwd?: string,
): Promise<SandboxResult> => {
  assertNetworkPolicy(command, profile);
  const start = Date.now();
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd,
    timeout: profile.timeoutMs,
    env: {
      ...process.env,
      REPOFLOW_NETWORK: profile.networkEnabled ? 'on' : 'off',
    },
  });
  const durationMs = Date.now() - start;
  return {
    exitCode: 0,
    durationMs,
    stdout: stdout.toString(),
    stderr: stderr.toString(),
  };
};
