import { spawn } from 'node:child_process';
import { ProviderAdapter, ProviderSession, ToolAction } from '../types';
import { commandExists, resolveArgs } from './utils';

const parseToolAction = (line: string): ToolAction | null => {
  if (line.startsWith('TOOL_EXEC:')) {
    return { type: 'tool_exec', command: line.replace('TOOL_EXEC:', '').trim() };
  }
  if (line.startsWith('FILE_READ:')) {
    return { type: 'file_read', target: line.replace('FILE_READ:', '').trim() };
  }
  if (line.startsWith('FILE_WRITE:')) {
    return { type: 'file_write', target: line.replace('FILE_WRITE:', '').trim() };
  }
  return null;
};

export class CodexAdapter implements ProviderAdapter {
  id: ProviderAdapter['id'] = 'codex';
  displayName = 'Codex CLI';

  async isAvailable(): Promise<boolean> {
    const command = process.env.SWITCHBOARD_CODEX_CMD ?? 'codex';
    return commandExists(command);
  }

  async startSession(options: {
    sessionId: string;
    systemPrompt: string;
  }): Promise<ProviderSession> {
    const command = process.env.SWITCHBOARD_CODEX_CMD ?? 'codex';

    return {
      sendMessage: async (input, handlers) => {
        const args = resolveArgs(process.env.SWITCHBOARD_CODEX_ARGS, input);
        const child = spawn(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            SWITCHBOARD_SESSION_ID: options.sessionId,
            SWITCHBOARD_SYSTEM_PROMPT: options.systemPrompt,
          },
        });

        return new Promise<void>((resolve, reject) => {
          child.stdout.on('data', (data) => {
            const chunk = data.toString();
            handlers.onToken(chunk);
            chunk
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .forEach((line) => {
                const action = parseToolAction(line);
                if (action && handlers.onToolAction) {
                  handlers.onToolAction(action);
                }
              });
          });

          child.stderr.on('data', (data) => {
            handlers.onToken(data.toString());
          });

          child.on('error', (error) => {
            reject(error);
          });

          child.on('close', (code) => {
            if (code && code !== 0) {
              reject(new Error(`Codex CLI exited with code ${code}`));
              return;
            }
            resolve();
          });
        });
      },
      stop: async () => Promise.resolve(),
    };
  }
}
