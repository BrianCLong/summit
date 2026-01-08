declare module "node:child_process" {
  export interface SpawnSyncReturns<T> {
    status: number | null;
    stdout: T;
    stderr: T;
    error?: Error;
  }

  export interface SpawnSyncOptions<T> {
    encoding?: BufferEncoding;
    env?: NodeJS.ProcessEnv;
  }

  export function spawnSync(
    command: string,
    args?: ReadonlyArray<string>,
    options?: SpawnSyncOptions<string>
  ): SpawnSyncReturns<string>;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
