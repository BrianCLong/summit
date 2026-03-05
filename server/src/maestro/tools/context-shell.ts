import path from 'path';
import { ToolExecutor, WorkflowContext } from '../engine/WorkflowEngine.js';

type FsMode = 'readonly' | 'workspace-write' | 'danger-full-access';

interface CreateContextShellOptions {
  fsMode?: FsMode;
}

interface ContextShellOutput {
  ok: boolean;
  [key: string]: unknown;
}

interface ContextShellApi {
  bash(command: string): Promise<ContextShellOutput>;
  readFile(filePath: string): Promise<ContextShellOutput>;
  writeFile(
    filePath: string,
    content: string,
    options: { justification?: string; format?: 'patch' | 'text' },
  ): Promise<ContextShellOutput>;
}

interface ContextShellModule {
  createContextShell(options: { root: string; fsMode: FsMode }): ContextShellApi;
}

let contextShellModulePromise: Promise<ContextShellModule> | undefined;

function loadContextShellModule(): Promise<ContextShellModule> {
  if (!contextShellModulePromise) {
    const moduleUrl = new URL(
      '../../../../libs/context-shell/node/index.js',
      import.meta.url,
    ).href;
    contextShellModulePromise = import(moduleUrl) as Promise<ContextShellModule>;
  }
  return contextShellModulePromise;
}

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
    const { createContextShell } = await loadContextShellModule();
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
