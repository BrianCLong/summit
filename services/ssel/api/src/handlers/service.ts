import { Request, Response } from 'express';
import { ServiceConfig } from '../../../core/src/types.js';

export const exposeServiceHandler = async (req: Request, res: Response) => {
  const body = req.body as ServiceConfig;
  console.log('Expose service:', body);
  res.status(501).send('Not Implemented');
};
