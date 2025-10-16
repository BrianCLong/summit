import { spawn } from 'child_process';
import { once } from 'events';

export type StdioProcess = {
  pid: number;
  write: (payload: unknown) => void;
  stream: AsyncGenerator<unknown>;
};

export async function launch(
  command: string,
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<StdioProcess> {
  const disableSandbox = process.env.NSJAIL_DISABLE === '1';
  const child = disableSandbox
    ? spawn(command, args, {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: { ...process.env, ...env },
      })
    : spawn(
        process.env.NSJAIL_BIN ?? 'nsjail',
        [
          '-q',
          '--config',
          process.env.NSJAIL_CONFIG ?? '/etc/nsjail/mcp-stdio.cfg',
          '--',
          command,
          ...args,
        ],
        {
          stdio: ['pipe', 'pipe', 'inherit'],
          env: { ...process.env, ...env },
        },
      );

  if (!child.stdin || !child.stdout) {
    child.kill();
    throw new Error('failed to spawn stdio server');
  }

  await once(child, 'spawn');

  const write = (payload: unknown) => {
    child.stdin!.write(JSON.stringify(payload));
    child.stdin!.write('\n');
  };

  async function* readStream(): AsyncGenerator<unknown> {
    let buffer = '';
    for await (const chunk of child.stdout) {
      buffer += chunk.toString('utf8');
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        if (line.trim().length > 0) {
          yield JSON.parse(line);
        }
        index = buffer.indexOf('\n');
      }
    }
  }

  return {
    pid: child.pid ?? -1,
    write,
    stream: readStream(),
  };
}
