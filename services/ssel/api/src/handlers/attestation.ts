import { Request, Response } from 'express';
import { AttestationStamp } from '../../../core/src/types.js';

export const getAttestationHandler = async (req: Request, res: Response) => {
  const response: AttestationStamp = {
    evidence_id: 'EVID-SSEL-MOCK',
    git_sha: 'mock',
    policy_sha: 'mock'
  };
  res.status(200).json(response);
};
