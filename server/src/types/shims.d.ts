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
  interface Timeout { }
  interface ReadableStream { }
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


declare module 'neo4j-driver' {
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



declare module 'html-escaper' {
  export function escape(str: string): string;
  export function unescape(str: string): string;
}

// Feature flags shim for when the workspace package types aren't available
declare module '@intelgraph/feature-flags' {
  export class FeatureFlagService {
    constructor(config: any);
    initialize(): Promise<void>;
    close(): Promise<void>;
    isReady(): boolean;
    getBooleanFlag(key: string, defaultValue: boolean, context?: any): Promise<boolean>;
    getStringFlag(key: string, defaultValue: string, context?: any): Promise<string>;
    getNumberFlag(key: string, defaultValue: number, context?: any): Promise<number>;
    getJSONFlag<T = any>(key: string, defaultValue: T, context?: any): Promise<T>;
    getEvaluation<T = any>(key: string, defaultValue: T, context?: any): Promise<any>;
    getAllFlags(context?: any): Promise<Record<string, any>>;
    track(eventName: string, context?: any, data?: any): Promise<void>;
    getFlagDefinition(key: string): Promise<any>;
    listFlags(): Promise<any[]>;
    setMetrics(metrics: any): void;
    getMetrics(): any;
  }
  export interface FeatureFlagProvider {
    initialize(): Promise<void>;
    close(): Promise<void>;
    isReady(): boolean;
    [key: string]: any;
  }
  export interface FlagCache {
    get<T>(key: string, context: any): Promise<any>;
    set<T>(key: string, context: any, evaluation: any, ttl: number): Promise<void>;
    delete(key: string, context: any): Promise<void>;
    clear(): Promise<void>;
  }
  export interface FlagContext {
    key?: string;
    [key: string]: any;
  }
  export interface FlagEvaluation<T = any> {
    key: string;
    value: T;
    exists: boolean;
    variation?: string;
    reason?: string;
    timestamp: number;
    fromCache?: boolean;
  }
  export interface FlagDefinition {
    key: string;
    name: string;
    description?: string;
    type: string;
    [key: string]: any;
  }
  export interface FlagMetrics {
    recordEvaluation(key: string, variation: string, duration: number): void;
    recordCacheHit(key: string): void;
    recordCacheMiss(key: string): void;
    recordError(key: string, error: Error): void;
  }
  export interface FeatureFlagConfig {
    provider: FeatureFlagProvider;
    cache?: FlagCache;
    cacheTTL?: number;
    enableCache?: boolean;
    enableAnalytics?: boolean;
    enableMetrics?: boolean;
    offline?: boolean;
    defaultContext?: Partial<FlagContext>;
  }
  const anyExport: any;
  export default anyExport;
}

declare module 'compression' {
  const anyExport: any;
  export = anyExport;
}

