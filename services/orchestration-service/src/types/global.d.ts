declare module 'express' {
  export interface Request {
    params: Record<string, string>;
    query: Record<string, string | undefined>;
    body: any;
  }

  export interface Response {
    json(body: any): Response;
    status(code: number): Response;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface RequestHandler {
    (req: Request, res: Response, next: NextFunction): any;
  }

  export interface Router {
    get(path: string, handler: RequestHandler): Router;
    post(path: string, handler: RequestHandler): Router;
    delete(path: string, handler: RequestHandler): Router;
    use(handler: RequestHandler): Router;
  }

  export interface Application {
    use(handler: any): Application;
    use(path: string, handler: any): Application;
    get(path: string, handler: RequestHandler): Application;
    listen(port: number | string, callback?: () => void): any;
  }

  function Router(): Router;

  interface Express {
    (): Application;
    Router: typeof Router;
    json(): RequestHandler;
    Request: Request;
    Response: Response;
    NextFunction: NextFunction;
  }

  const express: Express;
  export default express;
}

declare module 'cors' {
  import { RequestHandler } from 'express';
  function cors(options?: any): RequestHandler;
  export default cors;
}

declare module 'helmet' {
  import { RequestHandler } from 'express';
  function helmet(options?: any): RequestHandler;
  export default helmet;
}

declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: any): RequestHandler;
  export default compression;
}

declare module 'morgan' {
  import { RequestHandler } from 'express';
  function morgan(format: string, options?: any): RequestHandler;
  export default morgan;
}

declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    [key: string]: string | undefined;
  }

  interface Process {
    env: ProcessEnv;
    on(event: string, listener: (...args: any[]) => void): Process;
    exit(code?: number): never;
  }
}

declare var process: NodeJS.Process;
