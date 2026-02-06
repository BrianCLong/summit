declare module '@intelgraph/context-shell' {
  export type ContextShellOutput = {
    stdout: string;
    stderr: string;
    exitCode: number;
    filesRead: string[];
    filesWritten: string[];
    durationMs: number;
    redactionsApplied: string[];
  };

  export type CreateContextShellOptions = {
    root: string;
    fsMode?: 'readonly' | 'overlay';
  };

  export function createContextShell(options: CreateContextShellOptions): {
    bash: (command: string) => Promise<ContextShellOutput>;
    readFile: (path: string) => Promise<ContextShellOutput>;
    writeFile: (
      path: string,
      content: string,
      options?: { justification?: string; format?: 'text' | 'patch' },
    ) => Promise<ContextShellOutput>;
  };
}
