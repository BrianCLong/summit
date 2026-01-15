import path from 'path';
import {
  createContextShell,
  type ContextShellOutput,
  type CreateContextShellOptions,
} from '../../../../libs/context-shell/node/index.js';
import { ToolExecutor, WorkflowContext } from '../engine/WorkflowEngine.js';

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
