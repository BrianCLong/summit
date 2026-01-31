import { Request, Response } from 'express';

export const getArtifactHandler = async (req: Request, res: Response) => {
  const { path } = req.params;
  console.log('Get artifact:', path);
  res.status(501).send('Not Implemented');
};

export const putArtifactHandler = async (req: Request, res: Response) => {
  const { path } = req.params;
  console.log('Put artifact:', path);
  res.status(501).send('Not Implemented');
};
