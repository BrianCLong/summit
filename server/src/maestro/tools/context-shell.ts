import path from 'path';
import { createRequire } from 'node:module';
import { ToolExecutor, WorkflowContext } from '../engine/WorkflowEngine.js';

type ContextShellOutput = {
  stdout: string;
  stderr: string;
  exitCode: number;
  filesRead: string[];
  filesWritten: string[];
  durationMs: number;
  redactionsApplied: string[];
};

type CreateContextShellOptions = {
  root: string;
  fsMode?: 'readonly' | 'overlay';
};

const require = createRequire(import.meta.url);
const { createContextShell } = require('@intelgraph/context-shell') as {
  createContextShell: (options: CreateContextShellOptions) => {
    bash: (command: string) => Promise<ContextShellOutput>;
    readFile: (path: string) => Promise<ContextShellOutput>;
    writeFile: (
      path: string,
      content: string,
      options?: { justification?: string; format?: 'text' | 'patch' },
    ) => Promise<ContextShellOutput>;
  };
};

interface ContextShellParams {
  root?: string;
  fsMode?: CreateContextShellOptions['fsMode'];
  command?: string;
  path?: string;
  content?: string;
  justification?: string;
  format?: 'patch' | 'text';
}

type ContextShellAction = 'bash' | 'readFile' | 'writeFile';

export class ContextShellTool implements ToolExecutor {
  constructor(private action: ContextShellAction) {}

  async execute(params: ContextShellParams, _context: WorkflowContext): Promise<ContextShellOutput> {
    const root = path.resolve(params.root ?? process.cwd());
    const ctx = createContextShell({
      root,
      fsMode: params.fsMode ?? 'readonly',
    });

    if (this.action === 'bash') {
      return ctx.bash(params.command ?? '');
    }

    if (this.action === 'readFile') {
      return ctx.readFile(params.path ?? '');
    }

    return ctx.writeFile(params.path ?? '', params.content ?? '', {
      justification: params.justification,
      format: params.format ?? 'patch',
    });
  }
}
