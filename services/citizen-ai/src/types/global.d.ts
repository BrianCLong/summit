/**
 * Global type declarations for citizen-ai service
 */

declare const process: {
  env: Record<string, string | undefined>;
  memoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  on(event: string, listener: () => void): void;
  exit(code?: number): never;
};

declare function parseInt(s: string, radix?: number): number;

declare module 'express' {
  export interface Request {
    body: Record<string, string>;
    params: Record<string, string>;
    query: Record<string, string>;
  }

  export interface Response {
    json(body: unknown): Response;
    status(code: number): Response;
    setHeader(name: string, value: string): Response;
    on(event: string, listener: () => void): void;
    statusCode: number;
  }

  export interface NextFunction {
    (err?: Error): void;
  }

  export interface Router {
    get(path: string, handler: (req: Request, res: Response) => void | Promise<void>): void;
    post(path: string, handler: (req: Request, res: Response) => void | Promise<void>): void;
    put(path: string, handler: (req: Request, res: Response) => void | Promise<void>): void;
    delete(path: string, handler: (req: Request, res: Response) => void | Promise<void>): void;
  }

  export interface Application {
    use(handler: unknown): void;
    use(path: string, handler: unknown): void;
    listen(port: number, host: string, callback: () => void): void;
    listen(port: number, callback: () => void): void;
  }

  export function Router(): Router;

  interface Express {
    (): Application;
    json(options?: { limit?: string }): unknown;
    Router: typeof Router;
  }

  const express: Express;
  export default express;
}
