/*
 * Minimal module and global shims to allow TypeScript builds in environments
 * where optional runtime dependencies are not installed. These intentionally
 * type modules as `any` because the migrations and workers are not executed in
 * type-checking.
 */

declare const process: any;
declare const Buffer: any;
declare type Buffer = any;

declare namespace NodeJS {
  interface Timeout {}
  interface ReadableStream {}
}

declare interface Console {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

declare const console: Console;

declare function setTimeout(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): NodeJS.Timeout;
declare function clearTimeout(timeoutId: NodeJS.Timeout): void;
declare function setInterval(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): NodeJS.Timeout;
declare function clearInterval(timeoutId: NodeJS.Timeout): void;
declare function require(path: string): any;
declare const __dirname: string;

declare class URL {
  constructor(input: string, base?: string);
  [key: string]: any;
}

declare class URLSearchParams {
  constructor(init?: any);
  [key: string]: any;
}

declare class AbortSignal {
  readonly aborted: boolean;
  [key: string]: any;
}

declare class AbortController {
  readonly signal: AbortSignal;
  abort(reason?: any): void;
}

declare class TextDecoder {
  constructor(encoding?: string);
  decode(input?: ArrayBuffer | ArrayLike<number>): string;
}

declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<any>;
    end(): Promise<void>;
    query: any;
    [key: string]: any;
  }
  export = Pool;
}
declare module 'pgvector' {
  const anyExport: any;
  export = anyExport;
}
declare module 'crypto' {
  const anyExport: any;
  export = anyExport;
}
declare module 'fs' {
  const anyExport: any;
  export = anyExport;
}
declare module 'node:fs' {
  const anyExport: any;
  export = anyExport;
}
declare module 'fs/promises' {
  const anyExport: any;
  export = anyExport;
}
declare module 'path' {
  const anyExport: any;
  export = anyExport;
}
declare module 'node:path' {
  const anyExport: any;
  export = anyExport;
}
declare module 'stream/promises' {
  const anyExport: any;
  export = anyExport;
}
declare module 'graphql-subscriptions' {
  const anyExport: any;
  export = anyExport;
}
declare module 'graphql-redis-subscriptions' {
  const anyExport: any;
  export = anyExport;
}
declare module 'ioredis' {
  export default class IORedis {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export type Redis = any;
}
declare module 'bullmq' {
  export type JobsOptions = any;
  export type QueueOptions = any;
  export type QueueEventsOptions = any;
  export class Queue<T = any> {
    constructor(name: string, opts?: any);
    add(name: string, data: T, opts?: any): Promise<any>;
    [key: string]: any;
  }
  export class QueueEvents {
    constructor(name: string, opts?: any);
    [key: string]: any;
  }
  export class Worker<T = any> {
    constructor(name: string, processor: any, opts?: any);
    [key: string]: any;
  }
  export type Job<T = any> = any;
}
declare module 'zod' {
  const anyExport: any;
  export = anyExport;
}
declare module 'pino' {
  const anyExport: any;
  export = anyExport;
}
declare module 'pino-http' {
  const anyExport: any;
  export = anyExport;
}
declare module 'neo4j-driver' {
  const anyExport: any;
  export = anyExport;
}
declare module 'uuid' {
  const anyExport: any;
  export = anyExport;
}
declare module 'prom-client' {
  export class Registry {
    registerMetric(metric: any): void;
    metrics(): Promise<string>;
    [key: string]: any;
  }
  export class Counter<T = any> {
    constructor(opts: any);
    inc(...args: any[]): void;
    [key: string]: any;
  }
  export class Gauge<T = any> {
    constructor(opts: any);
    inc(...args: any[]): void;
    dec(...args: any[]): void;
    set(...args: any[]): void;
    [key: string]: any;
  }
  export class Histogram<T = any> {
    constructor(opts: any);
    observe(...args: any[]): void;
    [key: string]: any;
  }
  export const register: Registry;
  export const collectDefaultMetrics: any;
}
declare module 'child_process' {
  export const spawn: any;
  export const exec: any;
  export const execFile: any;
}
declare module 'python-shell' {
  export const PythonShell: any;
  export const run: any;
}
declare module 'ffprobe-static' {
  const anyExport: any;
  export = anyExport;
}
declare module 'fluent-ffmpeg' {
  const anyExport: any;
  export = anyExport;
}
declare module 'graphql-upload-ts' {
  const anyExport: any;
  export = anyExport;
}
declare module 'sharp' {
  const anyExport: any;
  export = anyExport;
}
declare module 'ffmpeg-static' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/api' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/sdk-node' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/sdk-metrics' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/exporter-prometheus' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/resources' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/semantic-conventions' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/exporter-trace-otlp-http' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/exporter-metrics-otlp-http' {
  const anyExport: any;
  export = anyExport;
}
declare module '@opentelemetry/auto-instrumentations-node' {
  const anyExport: any;
  export = anyExport;
}
declare module 'wasi' {
  const anyExport: any;
  export = anyExport;
}
declare module 'uWebSockets.js' {
  const anyExport: any;
  export = anyExport;
}
declare module 'node-fetch' {
  const anyExport: any;
  export = anyExport;
}
declare module 'punycode' {
  const anyExport: any;
  export = anyExport;
}
declare module 'winston' {
  const anyExport: any;
  export = anyExport;
}
declare module 'events' {
  export class EventEmitter {
    [key: string]: any;
  }
}

declare type JobsOptions = any;
declare type RedisClientType = any;
declare type Job = any;
