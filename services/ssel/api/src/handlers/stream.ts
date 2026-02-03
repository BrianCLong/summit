import { Request, Response } from 'express';

export const streamEventsHandler = async (req: Request, res: Response) => {
  res.status(501).send('Not Implemented');
};
