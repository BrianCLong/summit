/**
 * Node.js module declarations for workflow-operators
 */

declare module 'child_process' {
  interface ExecOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    encoding?: BufferEncoding;
    shell?: string;
    timeout?: number;
    maxBuffer?: number;
    killSignal?: string;
    uid?: number;
    gid?: number;
    windowsHide?: boolean;
  }

  interface ExecException extends Error {
    cmd?: string;
    killed?: boolean;
    code?: number;
    signal?: string;
    stdout?: string;
    stderr?: string;
  }

  interface ExecResult {
    stdout: string;
    stderr: string;
  }

  function exec(
    command: string,
    callback?: (error: ExecException | null, stdout: string, stderr: string) => void
  ): any;
  function exec(
    command: string,
    options: ExecOptions,
    callback?: (error: ExecException | null, stdout: string, stderr: string) => void
  ): any;

  interface SpawnOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    argv0?: string;
    stdio?: any;
    detached?: boolean;
    uid?: number;
    gid?: number;
    shell?: boolean | string;
    windowsVerbatimArguments?: boolean;
    windowsHide?: boolean;
  }

  function spawn(command: string, options?: SpawnOptions): any;
  function spawn(command: string, args?: readonly string[], options?: SpawnOptions): any;
}

declare module 'util' {
  function promisify<T extends (...args: any[]) => any>(fn: T): (...args: any[]) => Promise<any>;
}

declare module 'fs/promises' {
  function writeFile(path: string, data: string | Buffer): Promise<void>;
  function readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;
  function unlink(path: string): Promise<void>;
  function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  function rmdir(path: string): Promise<void>;
  function stat(path: string): Promise<any>;
  function access(path: string, mode?: number): Promise<void>;
}

declare module 'path' {
  function join(...paths: string[]): string;
  function resolve(...paths: string[]): string;
  function dirname(path: string): string;
  function basename(path: string, ext?: string): string;
  function extname(path: string): string;
  function normalize(path: string): string;
  function isAbsolute(path: string): boolean;
  function relative(from: string, to: string): string;
  const sep: string;
  const delimiter: string;
}

declare module 'os' {
  function tmpdir(): string;
  function homedir(): string;
  function hostname(): string;
  function platform(): NodeJS.Platform;
  function arch(): string;
  function cpus(): any[];
  function totalmem(): number;
  function freemem(): number;
  const EOL: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
  type Platform = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
}

declare var process: {
  env: NodeJS.ProcessEnv;
  cwd(): string;
  exit(code?: number): never;
  argv: string[];
  platform: NodeJS.Platform;
  pid: number;
};
