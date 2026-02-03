import path from 'node:path';
import { createContextShell, type ContextShellOptions } from '@libs/context-shell';
import type { ToolExecutor, ToolRegistry, WorkflowContext } from '../engine/WorkflowEngine.js';

export interface ContextShellAdapterOptions {
  root?: string;
  evidenceDir?: string;
  repoSha?: string;
  fsMode?: ContextShellOptions['fsMode'];
  limits?: ContextShellOptions['limits'];
  policy?: ContextShellOptions['policy'];
}

class ContextShellTool implements ToolExecutor {
  constructor(
    private readonly action: (params: any, context: WorkflowContext) => Promise<any>
  ) {}

  execute(params: any, context: WorkflowContext): Promise<any> {
    return this.action(params, context);
  }
}

export function registerContextShellTools(
  registry: ToolRegistry,
  options: ContextShellAdapterOptions = {}
): void {
  const root = options.root ?? process.cwd();
  const evidenceDir =
    options.evidenceDir ?? path.join(process.cwd(), 'evidence', 'context-shell');
  const repoSha = options.repoSha ?? process.env.GIT_SHA ?? 'unknown';

  const shell = createContextShell({
    root,
    fsMode: options.fsMode,
    limits: options.limits,
    policy: options.policy,
    repoSha,
    evidence: { enabled: true, dir: evidenceDir },
  });

  registry.register(
    'ctx.bash',
    new ContextShellTool(async (params: { command: string }) => {
      return shell.bash(params.command ?? '');
    })
  );

  registry.register(
    'ctx.readFile',
    new ContextShellTool(async (params: { path: string }) => {
      return shell.readFile(params.path ?? '');
    })
  );

  registry.register(
    'ctx.writeFile',
    new ContextShellTool(
      async (params: { path: string; content: string; justification?: string }) => {
        return shell.writeFile(params.path ?? '', params.content ?? '', {
          justification: params.justification,
          format: 'patch',
        });
      }
    )
  );
}
