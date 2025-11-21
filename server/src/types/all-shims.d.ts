// Module shims for external dependencies

declare module '@apollo/server' {
  export class ApolloServer<T = any> {
    constructor(options: any);
    start(): Promise<void>;
    stop(): Promise<void>;
    executeOperation(request: any): Promise<any>;
    [key: string]: any;
  }
  export interface ApolloServerPlugin<T = any> {
    [key: string]: any;
  }
  export type GraphQLRequestListener<T = any> = any;
  export type GraphQLRequestContext<T = any> = any;
  export type GraphQLRequestExecutionListener<T = any> = any;
  export type GraphQLRequestContextWillSendResponse<T = any> = any;
}

declare module '@apollo/server/express4' {
  export const expressMiddleware: any;
}

declare module '@apollo/server/plugin/drainHttpServer' {
  export const ApolloServerPluginDrainHttpServer: any;
}

declare module '@apollo/server/plugin/landingPage/default' {
  export const ApolloServerPluginLandingPageLocalDefault: any;
}

declare module '@as-integrations/express4' {
  export const expressMiddleware: any;
}

declare module '@graphql-tools/schema' {
  export const makeExecutableSchema: any;
}

declare module '@graphql-tools/utils' {
  export const mapSchema: any;
  export const getDirective: any;
  export const MapperKind: any;
  export type IResolvers<T = any, C = any> = any;
}

declare module '@graphql-tools/merge' {
  export const mergeResolvers: any;
  export const mergeTypeDefs: any;
}

declare module 'express' {
  export type Request = any;
  export type Response = any;
  export type NextFunction = any;
  export type Express = any;
  export type Router = any;
  const express: any;
  export default express;
}

declare module 'graphql' {
  export type GraphQLResolveInfo = any;
  export class GraphQLScalarType<T = any, E = any> {
    constructor(config: any);
    [key: string]: any;
  }
  export interface GraphQLScalarTypeConfig<T = any, E = any> {
    [key: string]: any;
  }
  export class GraphQLError extends Error {
    constructor(message: string, options?: any);
    [key: string]: any;
  }
  export class GraphQLSchema {
    constructor(config: any);
    [key: string]: any;
  }
  export const defaultFieldResolver: any;
  export type ASTVisitor = any;
  export type GraphQLFieldResolver<T = any, C = any, A = any, R = any> = any;
  export type GraphQLField<T = any, C = any, A = any> = any;
  export type GraphQLFieldConfig<T = any, C = any, A = any> = any;
  export const Kind: any;
  export const visit: any;
  export type ValidationContext = any;
  export type ASTNode = any;
}

declare module 'graphql-tag' {
  export const gql: any;
  export default gql;
}

declare module 'graphql-scalars' {
  export const DateTimeResolver: any;
  export const JSONResolver: any;
}

declare module 'graphql-ws/use/ws' {
  export const useServer: any;
}


declare module 'luxon' {
  export const DateTime: any;
}

declare module 'ws' {
  export class WebSocketServer {
    constructor(options: any);
    on(event: string, listener: any): this;
    clients: Set<WebSocket>;
    [key: string]: any;
  }
  export class WebSocket {
    constructor(url: string, options?: any);
    on(event: string, listener: any): this;
    send(data: any, callback?: any): void;
    close(): void;
    readyState: number;
    static OPEN: number;
    static CLOSED: number;
    [key: string]: any;
  }
  export namespace WebSocket {
    type Data = any;
    type Server = WebSocketServer;
  }
  export const OPEN: number;
  export const Server: typeof WebSocketServer;
}

declare module 'crypto' {
  export const sign: any;
  export const verify: any;
  export const createHash: any;
  export const randomUUID: any;
}

declare module 'cors' {
  namespace cors {
    interface CorsOptions {
      [key: string]: any;
    }
  }
  const corsMiddleware: any;
  export default corsMiddleware;
}

declare module 'helmet' {
  const helmet: any;
  export default helmet;
}

declare module 'express-rate-limit' {
  export const rateLimit: any;
  export type RateLimitRequestHandler = any;
  const _default: any;
  export default _default;
}

declare module 'rate-limit-redis' {
  const RedisStore: any;
  export default RedisStore;
}

declare module 'yaml' {
  export const parse: any;
  export const stringify: any;
}

declare module 'jsonwebtoken' {
  export const sign: any;
  export const verify: any;
  export const decode: any;
}

declare module 'body-parser' {
  export const json: any;
  export const urlencoded: any;
  export const raw: any;
}

declare module 'morgan' {
  const morgan: any;
  export default morgan;
}

declare module 'ajv' {
  class Ajv {
    constructor(options?: any);
    compile(schema: any): any;
    validate(schema: any, data: any): boolean;
    [key: string]: any;
  }
  export default Ajv;
}

declare module 'ajv-formats' {
  const addFormats: any;
  export default addFormats;
}

declare module 'archiver' {
  const archiver: any;
  export default archiver;
}

declare module 'js-yaml' {
  export const load: any;
  export const dump: any;
}

declare module 'flagsmith-nodejs' {
  const Flagsmith: any;
  export default Flagsmith;
}

declare module 'mysql2/promise' {
  export const createConnection: any;
  export const createPool: any;
}

declare module 'lodash' {
  const _: any;
  export default _;
}

declare module 'lru-cache' {
  class LRUCache<K = any, V = any> {
    constructor(options: any);
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    [key: string]: any;
  }
  export default LRUCache;
}


declare module 'express-validator' {
  export const body: any;
  export const param: any;
  export const query: any;
  export const validationResult: any;
}

declare module 'isomorphic-dompurify' {
  const DOMPurify: any;
  export default DOMPurify;
}

declare module 'compression' {
  const compression: any;
  export default compression;
}

declare module 'gpt-tokenizer' {
  export const encode: any;
  export const decode: any;
}

declare module 'socket.io' {
  export class Server {
    constructor(httpServer?: any, options?: any);
    on(event: string, listener: any): this;
    emit(event: string, ...args: any[]): boolean;
    of(nsp: string): any;
    [key: string]: any;
  }
  export type Socket = any;
}

declare module '@socket.io/redis-adapter' {
  export const createAdapter: any;
}

declare module '@opentelemetry/exporter-jaeger' {
  export const JaegerExporter: any;
}

declare module 'joi' {
  namespace Joi {
    interface Schema {
      validate(value: any): any;
      [key: string]: any;
    }
  }
  const Joi: {
    object(schema?: any): any;
    string(): any;
    number(): any;
    boolean(): any;
    array(): any;
    [key: string]: any;
  };
  export default Joi;
}

declare module 'apollo-server-express' {
  export const gql: any;
  export class ApolloServer {
    constructor(options: any);
    [key: string]: any;
  }
  export class AuthenticationError extends Error {
    constructor(message: string);
  }
  export class ForbiddenError extends Error {
    constructor(message: string);
  }
  export class UserInputError extends Error {
    constructor(message: string, properties?: any);
  }
  export class ApolloError extends Error {
    constructor(message: string, code?: string, extensions?: any);
  }
}
