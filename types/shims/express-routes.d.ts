/**
 * SHIM: Express handler typings relaxed to bridge Express 4/5 overload gaps.
 * TODO(typing): reconcile route signatures and remove this shim.
 */

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface RequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> {
    // placeholder to broaden acceptable handler shapes
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface ErrorRequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> {
    // placeholder to broaden acceptable handler shapes
  }
}

declare module 'express' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Request = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Response = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NextFunction = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type RequestHandler = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Application = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Router = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Router: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Express: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exp: any;
  export default exp;
}

// Global namespace fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const express: any;
