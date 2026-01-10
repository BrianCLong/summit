declare module 'fs' {
  export type PathLike = string;
  export type BufferEncoding = string;

  export interface FsPromises {
    readFile(path: PathLike, encoding: BufferEncoding): Promise<string>;
    writeFile(path: PathLike, data: string | Uint8Array, options?: { flag?: string }): Promise<void>;
    appendFile(path: PathLike, data: string | Uint8Array, options?: { encoding?: BufferEncoding }): Promise<void>;
    mkdir(path: PathLike, options?: { recursive?: boolean }): Promise<void>;
    rm(path: PathLike, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  }

  export const promises: FsPromises;
  export function createReadStream(path: PathLike): StreamLike;
  export function createWriteStream(path: PathLike): StreamLike;
  export function mkdtempSync(prefix: string): string;

  export interface StreamLike {
    on(event: 'data', listener: (chunk: Uint8Array | string) => void): void;
  }
}

declare module 'path' {
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
  export function basename(path: string): string;
}

declare module 'os' {
  export function tmpdir(): string;
}

declare module 'stream' {
  export function pipeline(...streams: unknown[]): void;
}

declare module 'util' {
  export function promisify<T extends (...args: unknown[]) => unknown>(
    fn: T,
  ): (...args: Parameters<T>) => Promise<ReturnType<T>>;
}

declare module 'crypto' {
  export function randomUUID(): string;
}

declare module 'child_process' {
  export interface StreamLike {
    on(event: 'data', listener: (chunk: Uint8Array | string) => void): void;
  }

  export interface ChildProcess {
    stdout?: StreamLike;
    stderr?: StreamLike;
    on(event: 'close', listener: (code: number | null) => void): void;
    on(event: 'exit', listener: (code: number | null) => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
  }

  export function spawn(command: string, args?: string[], options?: { stdio?: Array<'pipe' | 'ignore'> }): ChildProcess;
}

declare class Buffer extends Uint8Array {
  static from(data: string, encoding?: string): Buffer;
}

declare const process: {
  cwd(): string;
};
