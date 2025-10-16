// Ambient type declarations to smooth over third-party typing mismatches

// Pino: Provide a minimal Logger type alias for code importing { Logger } from 'pino'
declare module 'pino' {
  export type Logger = ReturnType<typeof import('pino')>;
}

// graphql-subscriptions: declare basic PubSub and withFilter types if missing
declare module 'graphql-subscriptions' {
  export class PubSub {
    asyncIterator(triggers: string | string[]): AsyncIterableIterator<any>;
    publish(trigger: string, payload: any): Promise<void>;
  }
  export function withFilter<TPayload = any, TVariables = any>(
    asyncIteratorFn: (args?: any) => AsyncIterableIterator<TPayload>,
    filterFn: (
      payload: TPayload,
      variables: TVariables,
    ) => boolean | Promise<boolean>,
  ): (args?: any) => AsyncIterableIterator<TPayload>;
}

// zod: ensure `z` is available even if types are not picked up
declare module 'zod' {
  export const z: any;
}

// OpenTelemetry API: minimal shape for common symbols used in code
declare module '@opentelemetry/api' {
  export const trace: any;
  export const context: any;
  export const _context: any;
  export const SpanStatusCode: any;
  export const SpanKind: any;
  export type Span = any;
}

// GraphQL tooling shims used in server
declare module 'graphql-depth-limit' { export function depthLimit(n: number): any }
declare module 'graphql-cost-analysis' { export function costAnalysis(options?: any): any }
declare module 'graphql-query-complexity' { export function createComplexityLimitRule(n: number, options?: any): any }
declare module '@apollo/server/express4' { export const expressMiddleware: any }
declare module 'graphql-shield' { export const shield: any }
declare module 'graphql-middleware' { export const applyMiddleware: any }

// prom-client Registry.merge augmentation
declare module 'prom-client' { export namespace Registry { function merge(regs: any[]): any } }

// Convenience alias
type bool = boolean;
