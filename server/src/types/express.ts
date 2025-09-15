import type { RequestHandler } from 'express';

export type RH<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  RequestHandler<P, ResBody, ReqBody, ReqQuery>;

