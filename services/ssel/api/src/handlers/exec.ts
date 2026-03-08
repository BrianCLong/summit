import { Request, Response } from 'express';
import { ExecRequest, ExecResponse } from '../../../core/src/types.js';

export const execHandler = async (req: Request, res: Response) => {
  const body = req.body as ExecRequest;
  console.log('Exec request:', body);
  const response: ExecResponse = {
    exitCode: 0,
    stdout: 'Mock execution',
    stderr: ''
  };
  res.status(200).json(response);
};
