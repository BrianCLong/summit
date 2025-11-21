// Global type declarations for task-scheduling package

declare namespace NodeJS {
  interface Timeout {
    ref(): this;
    unref(): this;
    hasRef(): boolean;
    refresh(): this;
    [Symbol.toPrimitive](): number;
  }
}

declare module 'fs/promises' {
  export function readFile(path: string, encoding: string): Promise<string>;
  export function writeFile(path: string, data: string): Promise<void>;
  export function access(path: string): Promise<void>;
  export function stat(path: string): Promise<{ mtime: Date; size: number }>;
  export function readdir(path: string): Promise<string[]>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  export function unlink(path: string): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
}
