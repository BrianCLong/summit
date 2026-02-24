import crypto from 'node:crypto';
import { RepoFlowRequest } from './types';

export type RepoFlowPlan = {
  evidenceId: string;
  changeSummary: string;
};

export const createPlan = (request: RepoFlowRequest): RepoFlowPlan => {
  const hash = crypto
    .createHash('sha256')
    .update(`${request.repoUrl}:${request.ref}:${request.slug}`)
    .digest('hex')
    .slice(0, 12);
  return {
    evidenceId: `EVID-${hash}`,
    changeSummary: request.changeDescription,
  };
};
