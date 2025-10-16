import type { Request, RequestHandler } from 'express';

export type RH<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
> = RequestHandler<P, ResBody, ReqBody, ReqQuery>;

export type RawReq<P = any, ResBody = any, ReqQuery = any> = Request<
  P,
  ResBody,
  Buffer,
  ReqQuery
>;
