import { spawnSync } from 'node:child_process';

export const commandExists = (command: string): boolean => {
  const result = spawnSync('which', [command], { stdio: 'ignore' });
  return result.status === 0;
};

export const resolveArgs = (
  rawArgs: string | undefined,
  prompt: string,
): string[] => {
  if (rawArgs) {
    try {
      const parsed = JSON.parse(rawArgs) as string[];
      return parsed.map((value) => value.replace('{prompt}', prompt));
    } catch {
      return rawArgs.split(' ').map((value) => value.replace('{prompt}', prompt));
    }
  }
  return ['--prompt', prompt];
};
